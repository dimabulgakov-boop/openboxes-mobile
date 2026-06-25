import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { Text } from 'react-native-paper';

import Button from '../../components/Button';
import { ContainerIcon } from '../../components/Icons';
import { ScannerInput } from '../../components/ScannerInput';
import { SearchButton } from '../../components/SearchButton';
import { useSearchButton } from '../../components/SearchButton/useSearchButton';
import { appConfig, EMPTY_STRING, HYPHEN } from '../../constants';
import Theme from '../../utils/Theme';
import styles from './styles';

type ContainerMismatchDialogProps = {
  visible: boolean;
  scannedContainer: string;
  expectedContainer: string | null | undefined;
  onDismiss: () => void;
  onConfirm: (code: string) => void;
};

export function ContainerMismatchDialog({
  visible,
  scannedContainer,
  expectedContainer,
  onDismiss,
  onConfirm
}: ContainerMismatchDialogProps) {
  const [dialogInput, setDialogInput] = useState<string>(EMPTY_STRING);
  const { isSearchOpen, searchButtonProps } = useSearchButton({ onSelect: setDialogInput });

  const handleDismiss = () => {
    setDialogInput(EMPTY_STRING);
    onDismiss();
  };

  const handleConfirm = (code: string) => {
    const trimmedInput = code?.trim();
    if (!trimmedInput) {
      Alert.alert('Container Required', 'Please scan, type, or search for the putaway container to use.');
      return;
    }

    setDialogInput(EMPTY_STRING);
    onConfirm(trimmedInput);
  };

  const displayExpectedContainer = expectedContainer || HYPHEN;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogContent}>
          <Text style={styles.dialogTitle}>Wrong Container Number</Text>
          <Text style={styles.dialogText}>
            The scanned container ({scannedContainer}) didn't match the expected container ({displayExpectedContainer}).
            Scan, type, or search for the container you want to use, then confirm.
          </Text>
          <View style={styles.bottomSpace}>
            <View style={styles.scannerRow}>
              <ScannerInput
                danger
                style={styles.scannerInput}
                leftIcon={<ContainerIcon size={24} color={Theme.colors.danger} />}
                label="Container"
                placeholder="Scan or type the container"
                value={dialogInput}
                isEnabled={!isSearchOpen}
                autoSubmitTimeout={appConfig.DEFAULT_SEARCH_DEBOUNCE_TIME}
                onChange={setDialogInput}
                onSubmit={handleConfirm}
              />
              <SearchButton searchType="container" {...searchButtonProps} />
            </View>
          </View>
          <View style={[styles.dialogActions, styles.topSpace]}>
            <Button
              icon="close"
              variant="secondary"
              style={[styles.dialogButton, styles.rightSpace]}
              title="Cancel"
              mode="contained"
              onPress={handleDismiss}
            />
            <Button
              icon="check"
              variant="danger"
              style={styles.dialogButton}
              title="Override"
              mode="contained"
              onPress={() => handleConfirm(dialogInput || scannedContainer)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
