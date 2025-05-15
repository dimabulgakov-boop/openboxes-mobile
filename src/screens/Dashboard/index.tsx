import React from 'react';
import { FlatList, ListRenderItemInfo, Text, View } from 'react-native';
import { Card } from 'react-native-paper';

import EmptyView from '../../components/EmptyView';
import { DashboardItem, Props, State } from './Types';
import dashboardData from './dashboardData';
import styles from './styles';

class Dashboard extends React.Component<Props, State> {
  renderItem = ({ item }: ListRenderItemInfo<DashboardItem>) => {
    const IconComponent = item.icon;

    return (
      <Card
        style={styles.cardContainer}
        onPress={() => {
          this.props.navigation.navigate(item.navigationScreenName);
        }}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.iconWrapper}>
            {IconComponent && <IconComponent width={styles.icon.width} height={styles.icon.height} />}
          </View>
          <Text style={styles.cardLabel}>{item.screenName}</Text>
        </Card.Content>
      </Card>
    );
  };

  keyExtractor = (item: DashboardItem, index: number): string =>
    item.id || item.navigationScreenName || `dashboard-item-${index}`;

  render() {
    return (
      <View style={styles.screenContainer}>
        <FlatList
          data={dashboardData as DashboardItem[]}
          renderItem={this.renderItem}
          keyExtractor={this.keyExtractor}
          numColumns={2}
          ListEmptyComponent={<EmptyView title={'No items found'} isRefresh={undefined} />}
          contentContainerStyle={styles.flatListContentContainer}
        />
      </View>
    );
  }
}

export default Dashboard;
