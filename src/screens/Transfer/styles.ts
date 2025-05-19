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
  formContainer: {
    padding: Theme.spacing.medium
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: ratio.height * 100
  },
  inputSpinner: {
    flex: 1,
    alignItems: 'center'
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
    marginTop: Theme.spacing.small
  }
});
