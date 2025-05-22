import { StyleSheet } from 'react-native';
import { ratio } from '../../constants';
import Theme from '../../utils/Theme';

export default StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  arrowDownIcon: {
    height: 15,
    width: 15
  },
  select: {
    width: '100%',
    borderWidth: 2,
    height: 40,
    alignSelf: 'center',
    borderColor: 'grey',
    backgroundColor: 'white',
    borderRadius: 5,
    marginTop: 10
  },
  formContainer: {
    padding: Theme.spacing.medium
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: ratio.height * 100
  },
  itemView: {
    marginTop: 5
  },
  rowItem: {
    flexDirection: 'row',
    borderColor: Theme.colors.background,
    marginTop: 1,
    padding: 2,
    marginStart: 4,
    width: '100%',
    alignItems: 'center'
  },
  columnItem: {
    display: 'flex',
    flexDirection: 'column',
    flex: 0,
    width: '50%'
  },
  label: {
    fontSize: 12,
    color: Theme.colors.placeholder
  },
  value: {
    fontSize: 16,
    color: Theme.colors.text,
    marginTop: 10,
    width: '90%'
  },
  dropdownDivider: {
    marginBottom: Theme.spacing.small,
    marginTop: Theme.spacing.small
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.medium
  },
  chipDefault: {
    height: 28,
    justifyContent: 'center',
    borderRadius: Theme.spacing.small,
    alignItems: 'center',
    marginRight: Theme.spacing.small,
    backgroundColor: Theme.colors.background
  },
  chipText: {
    fontSize: 12,
    color: Theme.colors.text
  },
  additionalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  caption: { fontSize: 12, color: Theme.colors.text },
  subheading: { fontWeight: 'bold', fontSize: 16 },
  button: {
    marginTop: Theme.spacing.medium
  }
});
