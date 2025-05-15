import { StyleSheet } from 'react-native';
import Theme from '../../utils/Theme';

export default StyleSheet.create({
  screenContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  contentContainer: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column'
  },
  lpnFilter: {
    marginHorizontal: 4,
    marginVertical: 8,
    backgroundColor: 'white'
  },
  list: {
    width: '100%'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chipDefault: {
    height: 24,
    justifyContent: 'center',
    borderRadius: 4,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: Theme.colors.background
  },
  chipDefaultText: {
    fontSize: 12,
    color: Theme.colors.text
  },
  contentDivider: {
    marginVertical: 8
  },
  destinationSubheading: {
    fontWeight: 'bold',
    fontSize: 16,
    color: Theme.colors.text,
    marginVertical: 4
  },
  caption: {
    fontSize: 12,
    color: Theme.colors.placeholder,
    marginVertical: 4
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6
  },
  columnItem: {
    flexDirection: 'column',
    width: '48%'
  },
  label: {
    fontSize: 12,
    color: Theme.colors.placeholder,
    marginBottom: 2
  },
  value: {
    fontSize: 14,
    color: Theme.colors.text
  }
});
