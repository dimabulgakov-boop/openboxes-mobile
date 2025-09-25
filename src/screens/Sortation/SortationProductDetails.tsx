import React from 'react';
import { View } from 'react-native';
import { Chip, Divider, Paragraph, Switch, Text, Title } from 'react-native-paper';

import { EMPTY_FALLBACK } from '../../constants';
import { DetailChip, SortationProduct, SortationTask } from '../../types/sortation';
import Theme from '../../utils/Theme';
import styles from './styles';

export type SortationProductDetailsProps = {
  product: SortationProduct;
  detailsChips: DetailChip[];
  showDirectPutawayRequired?: boolean;
  directPutawayRequired?: boolean;
  task: SortationTask;
  onToggleDirectPutaway?: (value: boolean) => void;
};

export default function SortationProductDetails({
  product,
  detailsChips,
  showDirectPutawayRequired = false,
  directPutawayRequired = false,
  task,
  onToggleDirectPutaway
}: SortationProductDetailsProps) {
  const { productCode, name } = product;

  return (
    <View style={styles.productDetails}>
      <View style={styles.headerRow}>
        <Chip icon="barcode" style={styles.chipDefault} textStyle={styles.chipText}>
          {`Product Code: ${productCode}`}
        </Chip>
      </View>

      <Divider style={styles.contentDivider} />

      <View style={styles.headerRow}>
        <Title style={styles.title}>{name}</Title>
        <Chip style={[styles.chipWarning]} textStyle={styles.chipText}>
          {`${task.type ?? EMPTY_FALLBACK}`}
        </Chip>
      </View>

      {detailsChips.map(({ icon, value, label }) => (
        <Chip key={label} icon={icon} style={[styles.chipDefault, styles.topSpace]}>
          <Text style={styles.chipText}>
            {label}: <Text style={[styles.bold, styles.chipText]}>{value ?? EMPTY_FALLBACK}</Text>
          </Text>
        </Chip>
      ))}

      {showDirectPutawayRequired && (
        <>
          <Divider style={styles.contentDivider} />
          <View style={styles.cardAnnotation}>
            <Paragraph style={[styles.paragraph, styles.bold]}>Direct Putaway Required</Paragraph>
            <Switch
              disabled={!onToggleDirectPutaway}
              color={Theme.colors.primary}
              value={directPutawayRequired}
              onValueChange={(val) => onToggleDirectPutaway?.(val)}
            />
          </View>
        </>
      )}
    </View>
  );
}
