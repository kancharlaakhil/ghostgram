import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen({ navigation }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isValidPassword = (password) => {
    const minLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  };

  const handleChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return Alert.alert('Error', 'Please fill all fields.');
    }

    if (newPassword !== confirmPassword) {
      return Alert.alert('Error', 'New passwords do not match.');
    }

    if (!isValidPassword(newPassword)) {
      return Alert.alert(
        'Error',
        'Password must be at least 6 characters and include:\n• One uppercase\n• One lowercase\n• One number\n• One special character'
      );
    }

    try {
      const user = auth().currentUser;

      const credential = auth.EmailAuthProvider.credential(
        user.email,
        oldPassword
      );

      await user.reauthenticateWithCredential(credential);

      await user.updatePassword(newPassword);

      Alert.alert('Success', 'Password changed successfully.');
      navigation.goBack();
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect old password.');
      } else {
        Alert.alert('Error', 'Failed to change password Please try again later.');
      }
    }
  };

  const renderPasswordInput = (label, value, setValue, show, toggleShow) => (
    <View style={styles.inputContainer}>
      <TextInput
        placeholder={label}
        placeholderTextColor='grey'
        secureTextEntry={!show}
        value={value}
        onChangeText={setValue}
        style={styles.input}
      />
      <TouchableOpacity onPress={toggleShow} style={styles.eyeIcon}>
        <Ionicons name={show ? 'eye' : 'eye-off'} size={22} color="#888" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
    <View style={styles.container}>
      {renderPasswordInput('Enter old password', oldPassword, setOldPassword, showOld, () => setShowOld(!showOld))}
      {renderPasswordInput('Enter new password', newPassword, setNewPassword, showNew, () => setShowNew(!showNew))}
      {renderPasswordInput('Confirm new password', confirmPassword, setConfirmPassword, showConfirm, () => setShowConfirm(!showConfirm))}

      <TouchableOpacity onPress={handleChange} style={styles.button}>
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafe',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 14,
    paddingRight: 45,
    backgroundColor: 'white',
    fontSize: 16,
    color: 'black',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
