import { RouteProp, useIsFocused, useRoute } from '@react-navigation/native';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import {
  Dialog,
  Divider,
  IconButton,
  Button as PaperButton,
  TextInput as PaperTextInput,
  Paragraph,
  Portal,
  Subheading,
  Switch
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

import AsyncModalSelect from '../../components/AsyncModalSelect';
import Button from '../../components/Button';
import EmptyView from '../../components/EmptyView';
import { appConfig, INPUT_FOCUS_DELAY_TIME_IN_MS } from '../../constants';
import { navigate, replace } from '../../NavigationService';
import { getAlternativeDestinationsAction, searchLocationByLocationNumber } from '../../redux/actions/locations';
import { getReasonCodesAction } from '../../redux/actions/others';
import { patchPutawayTaskAction } from '../../redux/actions/putaways';
import { RootState } from '../../redux/reducers';
import { SortationPutawayScreenType } from '../../types/sortation';
import Theme from '../../utils/Theme';
import PutawayDetails from './PutawayDetails';
import { SkipButton } from './SkipButton';
import styles from './styles';

type PutawayQuantityRouteProp = RouteProp<
  { SortationPutawayQuantity: SortationPutawayScreenType },
  'SortationPutawayQuantity'
>;

type Location = {
  id: string;
  name: string;
  locationNumber?: string;
};

type ReasonCode = {
  id: string;
  name: string;
};

export default function PutawayQuantityScreen() {
  const { params } = useRoute<PutawayQuantityRouteProp>();
  const { taskList, currentTaskIndex, isDirectPutaway } = params;
  const putawayDetails = taskList[currentTaskIndex];
  const dispatch = useDispatch();

  const inputRef = useRef<TextInput | null>(null);
  const isFocused = useIsFocused();
  const currentLocation = useSelector((rootState: RootState) => rootState.mainReducer.currentLocation);

  const [putawayQuantity, setPutawayQuantity] = useState<number | undefined>();
  const [alternativeLocations, setAlternativeLocations] = useState<Location[]>([]);
  const [selectedAlternativeDestination, setSelectedAlternativeDestination] = useState<Location | null>(
    putawayDetails.destination
  );
  const [reasonCodes, setReasonCodes] = useState<ReasonCode[]>([]);
  const [selectedReasonCode, setSelectedReasonCode] = useState<ReasonCode | null>(null);
  const [isCancelRemainingEnabled, setIsCancelRemainingEnabled] = useState<boolean>(false);

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [tempAlternativeLocation, setTempAlternativeLocation] = useState<Location | null>(null);
  const [scannedLocationInput, setScannedLocationInput] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const performLocationSearch = useCallback(
    (locationNumber: string) => {
      const trimmedText = locationNumber.trim();
      if (!trimmedText) {
        setTempAlternativeLocation(null);
        return;
      }

      dispatch(
        searchLocationByLocationNumber(trimmedText, (data: any) => {
          if (data && !data.error) {
            const foundLocation: Location = {
              id: data.id,
              name: data.name,
              locationNumber: data.locationNumber
            };
            setTempAlternativeLocation(foundLocation);
          } else {
            setTempAlternativeLocation(null);
          }
        })
      );
    },
    [dispatch]
  );

  const debouncedLocationSearch = useMemo(
    () => debounce(performLocationSearch, appConfig.DEFAULT_DEBOUNCE_TIME),
    [performLocationSearch]
  );

  useEffect(() => {
    return () => {
      debouncedLocationSearch.cancel();
    };
  }, [debouncedLocationSearch]);

  useEffect(() => {
    dispatch(
      getReasonCodesAction('PUTAWAY_DISCREPANCY', (data: any) => {
        if (data?.error) {
          Alert.alert('Error', 'Failed to load reason codes.');
        } else {
          setReasonCodes(data);
        }
      })
    );
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      getAlternativeDestinationsAction(putawayDetails.facility.id, putawayDetails.id, (data: any) => {
        if (data?.error) {
          Alert.alert('Error', 'Failed to load alternative locations.');
          return;
        }
        const mappedLocations: Location[] = data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          locationNumber: item.locationNumber
        }));

        setAlternativeLocations(mappedLocations);
      })
    );
  }, [dispatch, currentLocation.id, putawayDetails.destination?.id, putawayDetails.facility.id, putawayDetails.id]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), INPUT_FOCUS_DELAY_TIME_IN_MS);
    return () => clearTimeout(t);
  }, [isFocused]);

  if (!putawayDetails) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyView
          title="Putaway Details Not Found"
          description="The putaway details you are looking for do not exist or are not available."
        />
      </View>
    );
  }

  function handleChange(text: string) {
    // Strip non-numeric characters and convert to number
    const digitsOnly = text.replace(/[^0-9]/g, '');
    const num = digitsOnly.length > 0 ? parseInt(digitsOnly, 10) : undefined;
    setPutawayQuantity(num);
  }

  function handleConfirm() {
    if (!isCancelRemainingEnabled) {
      if (!putawayQuantity) {
        Alert.alert('Invalid Putaway Quantity', 'Quantity is required.');
        return;
      }

      if (putawayQuantity < 1 || putawayQuantity > putawayDetails.quantity) {
        Alert.alert(
          'Invalid Putaway Quantity',
          `Please enter a valid putaway quantity between 1 and ${putawayDetails.quantity}.`
        );
        return;
      }
    }

    const isAlternativeLocationSelected = selectedAlternativeDestination?.id !== putawayDetails.destination?.id;
    if (putawayQuantity === putawayDetails.quantity || isCancelRemainingEnabled) {
      if (isCancelRemainingEnabled && !selectedReasonCode?.id) {
        Alert.alert('Discrepancy Reason Required', 'Please select a discrepancy reason.');
        return;
      }
      const payload = {
        action: 'complete',
        destination: selectedAlternativeDestination?.id,
        force: isAlternativeLocationSelected,
        isCancelRemaining: isCancelRemainingEnabled,
        reasonCode: selectedReasonCode?.id ? selectedReasonCode.id : null
      };
      dispatch(
        patchPutawayTaskAction(putawayDetails.facility.id, putawayDetails.id, payload, (response) => {
          if (response && !response.error) {
            Alert.alert('Sortation Successful', 'The product has been sorted successfully.');
            const nextTaskIndex = currentTaskIndex + 1;
            if (nextTaskIndex < taskList.length) {
              navigate('SortationPutawayLocationScan', {
                taskList,
                currentTaskIndex: nextTaskIndex,
                isDirectPutaway
              });
            } else {
              if (isDirectPutaway) {
                navigate('Sortation');
              } else {
                navigate('SortationPutaway');
              }
            }
          } else {
            Alert.alert('Sortation Failed', response.errorMessage || 'Sortation Failed');
          }
        })
      );
    } else {
      if (!selectedReasonCode?.id) {
        Alert.alert('Discrepancy Reason Required', 'Please select a discrepancy reason.');
        return;
      }
      const payload = {
        action: 'partialComplete',
        quantity: putawayQuantity,
        destination: selectedAlternativeDestination?.id,
        reasonCode: selectedReasonCode?.id ? selectedReasonCode.id : null
      };
      dispatch(
        patchPutawayTaskAction(putawayDetails.facility.id, putawayDetails.id, payload, (response) => {
          if (response && !response.error && response.data) {
            const remainingTask = response.data;
            replace('SortationPutawayQuantity', {
              taskList: [remainingTask],
              currentTaskIndex: 0,
              isDirectPutaway
            });
          } else {
            Alert.alert('Partial Putaway Failed', response.errorMessage || 'Partial putaway operation failed');
          }
        })
      );
    }
  }

  function handleCancelRemainingToggle(isEnabled: boolean) {
    setIsCancelRemainingEnabled(isEnabled);

    if (isEnabled) {
      setPutawayQuantity(putawayDetails.quantity);
    } else {
      setPutawayQuantity(undefined);
    }
  }

  function handleRequestAlternativeLocation() {
    setTempAlternativeLocation(selectedAlternativeDestination);
    setIsDialogVisible(true);
  }

  const hideDialog = () => {
    setIsDialogVisible(false);
    setScannedLocationInput('');
  };

  const handleSuggestLocation = () => {
    if (alternativeLocations.length === 0) {
      return;
    }

    const suggestedLocation = alternativeLocations[suggestionIndex];
    setTempAlternativeLocation(suggestedLocation);
    setScannedLocationInput('');

    const nextIndex = (suggestionIndex + 1) % alternativeLocations.length;
    setSuggestionIndex(nextIndex);
  };

  const handleScanLocation = (text: string) => {
    setScannedLocationInput(text);
    debouncedLocationSearch(text);
  };

  const handleConfirmAlternative = () => {
    setSelectedAlternativeDestination(tempAlternativeLocation);
    hideDialog();
  };

  const updatedPutawayDetails = {
    ...putawayDetails,
    destination: selectedAlternativeDestination
  };

  return (
    <Portal.Host>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.contentContainer}>
        <PutawayDetails putawayDetails={updatedPutawayDetails} />
        <Divider />

        <View style={styles.formContainer}>
          <Subheading style={styles.subheading}>Enter Putaway Quantity</Subheading>
          <PaperTextInput
            ref={inputRef}
            autoCompleteType="off"
            style={styles.topSpace}
            mode="outlined"
            label="Putaway Quantity Entry Field"
            keyboardType="number-pad"
            value={putawayQuantity?.toString() || ''}
            returnKeyType="done"
            onChangeText={handleChange}
          />

          <View style={styles.topSpace}>
            <View style={[styles.headerRow, styles.bottomSpace]}>
              <Paragraph style={styles.paragraph}>Alternative Location?</Paragraph>
              <Button
                style={styles.secondaryButton}
                size="50%"
                title="Request"
                onPress={handleRequestAlternativeLocation}
              />
            </View>

            <View style={styles.headerRow}>
              <Paragraph style={styles.paragraph}>Discrepancy Reason</Paragraph>
              <View style={styles.dropdownContainer}>
                <AsyncModalSelect
                  placeholder="Select a reason"
                  label="Reason for shortage"
                  initValue={selectedReasonCode?.name || ''}
                  initialData={reasonCodes}
                  searchAction={() => {}}
                  serverSearchEnabled={false}
                  onSelect={(reason: ReasonCode) => setSelectedReasonCode(reason)}
                />
              </View>
            </View>
          </View>

          <View style={styles.cardAnnotation}>
            <Paragraph style={[styles.paragraph]}>Cancel Remaining</Paragraph>
            <Switch
              value={isCancelRemainingEnabled}
              color={Theme.colors.primary}
              onValueChange={handleCancelRemainingToggle}
            />
          </View>
        </View>

        <View style={styles.bottomActionContainer}>
          <Button style={styles.topSpace} title="Confirm" mode="contained" size="100%" onPress={handleConfirm}>
            Submit
          </Button>
          <SkipButton taskList={taskList} currentTaskIndex={currentTaskIndex} />
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={isDialogVisible} dismissable={false} onDismiss={hideDialog}>
          <IconButton icon="close" size={24} style={styles.dialogCloseButton} onPress={hideDialog} />
          <Dialog.Title>Choose Alternative Location</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogCurrentLocationWrapper}>
              <Paragraph style={styles.dialogCurrentLocationLabel}>Current Location: </Paragraph>
              {putawayDetails.destination?.name || 'Unassgined'}
            </Paragraph>

            <PaperButton icon="shuffle-variant" mode="contained" onPress={handleSuggestLocation}>
              Suggest new location
            </PaperButton>

            <PaperTextInput
              label="Scan location number"
              value={scannedLocationInput}
              mode="outlined"
              style={styles.dialogScanLocationInput}
              autoCompleteType="off"
              onChangeText={handleScanLocation}
            />

            <Subheading style={styles.dialogNewLocationHeader}>
              New Location: {tempAlternativeLocation?.name || 'Unknown'}
            </Subheading>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <PaperButton onPress={hideDialog}>Cancel</PaperButton>
            <PaperButton onPress={handleConfirmAlternative}>OK</PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Portal.Host>
  );
}
