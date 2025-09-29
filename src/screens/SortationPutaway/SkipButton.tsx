import React from 'react';
import { Alert } from 'react-native';

import Button from '../../components/Button';
import { navigate } from '../../NavigationService';
import { SortationPutawayScreenType } from '../../types/sortation';
import styles from './styles';

export function SkipButton({ taskList, currentTaskIndex, isDirectPutaway = false }: SortationPutawayScreenType) {
  function handleSkip() {
    Alert.alert(
      'Skip Putaway',
      'Are you sure you want to skip this putaway task? It will be moved to the end of the queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            const nextIndex = currentTaskIndex + 1;
            const currentIndex = nextIndex < taskList.length ? nextIndex : 0;

            navigate('SortationPutawayLocationScan', {
              taskList,
              currentTaskIndex: currentIndex,
              isDirectPutaway
            });
          }
        }
      ]
    );
  }

  return (
    <Button style={styles.topSpace} title="Skip" mode="text" size="100%" onPress={handleSkip}>
      Skip
    </Button>
  );
}
