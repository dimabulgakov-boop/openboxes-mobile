import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, EmitterSubscription, Platform } from 'react-native';
import DataWedgeIntents from 'react-native-datawedge-intents';

import {
  ACTION,
  FILTER_ACTIONS,
  FILTER_CATEGORY,
  LISTENER,
  PROFILE,
  PROFILE_CONFIG,
  PROFILE_CONFIG2
} from './constant';

export type ScanResult = {
  data: string;
  labelType?: string;
};

type ScanCallback = (result: ScanResult) => void;

let profileConfigured = false;

// The scanner is owned by a single listener at a time. Enabled consumers are
// tracked as a stack and only the most recently enabled one (top of stack)
// receives scans, behind one shared DeviceEventEmitter subscription.
//
// A single hardware scan produces exactly one intent broadcast, which the
// emitter dispatches to every registered listener. Without single-owner
// delivery, when two ScannerInputs are momentarily mounted together — e.g. a
// screen input and a modal dialog input during a dialog open/close transition —
// both would handle the same scan and the value would be applied twice.
const scanCallbacks: ScanCallback[] = [];
let sharedSubscription: EmitterSubscription | null = null;

function sendDataWedgeCommand(extraName: string, extraValue: unknown): void {
  DataWedgeIntents.sendBroadcastWithExtras({
    action: ACTION.API_ACTION,
    extras: { [extraName]: extraValue, SEND_RESULT: 'false' }
  });
}

function configureProfileOnce(): void {
  if (profileConfigured) {
    return;
  }
  profileConfigured = true;
  sendDataWedgeCommand(PROFILE.CREATE_PROFILE, PROFILE.NAME);
  sendDataWedgeCommand(PROFILE.SET_CONFIG_PROFILE, PROFILE_CONFIG);
  sendDataWedgeCommand(PROFILE.SET_CONFIG_PROFILE, PROFILE_CONFIG2);
}

function extractScan(intent: Record<string, any>): ScanResult | null {
  const data = intent?.[ACTION.DATA_STRING] ?? intent?.data;
  if (!data) {
    return null;
  }
  const labelType = intent?.[ACTION.LABEL_TYPE] ?? intent?.labelType;
  return { data: String(data).trim(), labelType: labelType ? String(labelType) : undefined };
}

function ensureSubscribed(): void {
  if (sharedSubscription) {
    return;
  }
  configureProfileOnce();
  DataWedgeIntents.registerBroadcastReceiver({
    filterActions: FILTER_ACTIONS,
    filterCategories: FILTER_CATEGORY
  });
  sharedSubscription = DeviceEventEmitter.addListener(LISTENER.BROADCAST_INTENT, (intent: Record<string, any>) => {
    const activeCallback = scanCallbacks[scanCallbacks.length - 1];
    if (!activeCallback) {
      return;
    }
    const result = extractScan(intent);
    if (result) {
      activeCallback(result);
    }
  });
}

function teardownIfIdle(): void {
  if (scanCallbacks.length === 0 && sharedSubscription) {
    sharedSubscription.remove();
    sharedSubscription = null;
  }
}

export function useScanListener(onScan: ScanCallback, enabled = true): void {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android' || !DataWedgeIntents?.registerBroadcastReceiver) {
      return;
    }

    const callback: ScanCallback = (result) => onScanRef.current(result);
    scanCallbacks.push(callback);
    ensureSubscribed();

    return () => {
      const index = scanCallbacks.indexOf(callback);
      if (index !== -1) {
        scanCallbacks.splice(index, 1);
      }
      teardownIfIdle();
    };
  }, [enabled]);
}
