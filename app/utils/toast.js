// utils/toast.js
import Toast from 'react-native-toast-message';

export const showToast = (type, title, message) => {
  Toast.show({
    type: type,
    text1: title,
    text2: message,
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
  });
};

export const toastMessages = {
  success: {
    type: 'success',
    title: 'Success',
  },
  error: {
    type: 'error',
    title: 'Error',
  },
  info: {
    type: 'info',
    title: 'Info',
  },
  warning: {
    type: 'warning',
    title: 'Warning',
  },
};
