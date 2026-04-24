import React from 'react';
import { Text, View } from 'react-native';

import { HYPHEN } from '../../constants';
import styles from './styles';
import { Props } from './types';

const LabeledData: React.FC<Props> = ({ style, label, value, defaultValue = HYPHEN }) => {
  return (
    <View style={[style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.data}>{value ?? defaultValue}</Text>
    </View>
  );
};

export default LabeledData;
