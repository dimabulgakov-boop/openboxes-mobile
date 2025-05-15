import { StyleSheet } from 'react-native';

import Theme from '../../utils/Theme';

export default StyleSheet.create({
  container: {
    flex: 1
  },
  select: {
    width: '100%',
    borderWidth: 0,
    height: 40
  },
  quantityBox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quantityInput: {
    borderWidth: 1,
    height: 30,
    width: 60,
    marginRight: 10,
    paddingVertical: 2,
    paddingHorizontal: 8
  },
  quantityText: {
    fontSize: 23
  },
  inputSpinner: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 10
  },
  contentContainer: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    padding: 8
  },
  dataContainer: {
    padding: 16,
    backgroundColor: Theme.colors.surface
  },
  label: {
    fontSize: 12,
    color: Theme.colors.placeholder
  },
  title: {
    fontSize: 16,
    color: Theme.colors.text,
    fontWeight: 'bold'
  },
  value: {
    fontSize: 14,
    color: Theme.colors.text
  },
  rowItem: {
    flexDirection: 'row',
    borderColor: Theme.colors.background,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  columnItem: {
    display: 'flex',
    flexDirection: 'column',
    flex: 0
  },
  buttonContainer: {
    marginTop: 4,
    marginBottom: 8
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  chipDefault: {
    height: 24,
    justifyContent: 'center',
    borderRadius: 4,
    alignItems: 'center'
  },
  chipWarningText: {
    fontSize: 12,
    color: Theme.colors.text
  },
  lastChild: {
    marginRight: 0
  },
  dividerHorizontal: {
    marginVertical: 12,
    height: 1
  },
  additionalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  formContainer: {
    padding: 16
  }
});
