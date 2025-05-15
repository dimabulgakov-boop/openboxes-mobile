import React from 'react';
import { SvgProps } from 'react-native-svg';

export interface OwnProps {
  navigation: any;
}

export interface StateProps {
  //no-op
}

export interface DispatchProps {
  //no-op
}

export type Props = OwnProps & StateProps & DispatchProps;

export interface State {
  // navigationState: NavigationState;
}

export type DashboardItem = {
  screenName: string;
  // Assuming all icons are SVG components
  icon: React.FC<SvgProps>;
  navigationScreenName: string;
  id?: string;
};
