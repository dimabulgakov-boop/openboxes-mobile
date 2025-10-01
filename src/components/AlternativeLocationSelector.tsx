import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  Button as PaperButton,
  Dialog,
  IconButton,
  Paragraph,
  Portal,
  Subheading,
  TextInput as PaperTextInput
} from 'react-native-paper';
import { useDispatch } from 'react-redux';
import styles from '../screens/SortationPutaway/styles';
import { getAlternativeDestinationsAction, searchLocationByLocationNumber } from '../redux/actions/locations';
import { appConfig } from '../constants';
import { PutawayDetailsModel, SortationLocation } from '../types/sortation';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (location: SortationLocation) => void;
  putawayDetails: PutawayDetailsModel;
  initialLocation: SortationLocation | null;
};

export default function AlternativeLocationSelector({
  visible,
  onDismiss,
  onConfirm,
  putawayDetails,
  initialLocation
}: Props) {
  const dispatch = useDispatch();

  const [alternativeLocations, setAlternativeLocations] = useState<SortationLocation[]>([]);
  const [tempAlternativeLocation, setTempAlternativeLocation] = useState<SortationLocation | null>(initialLocation);
  const [scannedLocationInput, setScannedLocationInput] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setTempAlternativeLocation(initialLocation);
      setScannedLocationInput('');
      setSuggestionIndex(0);
    }
  }, [visible, initialLocation]);

  useEffect(() => {
    if (!visible) return;

    dispatch(
      getAlternativeDestinationsAction(putawayDetails.facility.id, putawayDetails.id, (data: any) => {
        if (data?.error) {
          Alert.alert('Error', 'Failed to load alternative locations.');
          return;
        }
        const mappedLocations: SortationLocation[] = data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          locationNumber: item.locationNumber
        }));
        setAlternativeLocations(mappedLocations);
      })
    );
  }, [dispatch, putawayDetails.facility.id, putawayDetails.id, visible]);

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
            setTempAlternativeLocation(data);
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

  const handleSuggestLocation = () => {
    if (alternativeLocations.length === 0) return;
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
    if (tempAlternativeLocation) {
      onConfirm(tempAlternativeLocation);
    }
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} dismissable={false} onDismiss={onDismiss}>
        <IconButton icon="close" size={24} style={styles.dialogCloseButton} onPress={onDismiss} />
        <Dialog.Title>Choose Alternative Location</Dialog.Title>
        <Dialog.Content>
          <Paragraph style={styles.dialogCurrentLocationWrapper}>
            <Paragraph style={styles.dialogCurrentLocationLabel}>Current Location: </Paragraph>
            {putawayDetails.destination?.name || 'Unassigned'}
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
          <PaperButton onPress={onDismiss}>Cancel</PaperButton>
          <PaperButton onPress={handleConfirmAlternative}>OK</PaperButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
