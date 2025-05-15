import React from 'react';
import { View } from 'react-native';

import LabeledData from '../LabeledData';
import { Props as LabeledDataProps } from '../LabeledData/types';
import styles, { columnStyle } from './styles';

interface DetailsTableProps {
  data: LabeledDataProps[];
  columns?: number;
  style?: any;
}

const DetailsTable: React.FC<DetailsTableProps> = ({ style, data, columns = 2 }) => {
  return (
    <View style={[style, styles.container]}>
      {data.map((dataProps) => (
        <LabeledData key={dataProps.label} style={columnStyle(columns).column} {...dataProps} />
      ))}
    </View>
  );
};

export default DetailsTable;
