import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleEmailReset = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your Registered Email.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid Format', 'Please enter a valid email address.');
      return;
    }

    try {
      const snapshot = await firestore()
        .collection('users')
        .where('email', '==', email)
        .get();

      if (snapshot.empty) {
        Alert.alert('No User Found', 'No account found with this email.');
        return;
      }

      await auth().sendPasswordResetEmail(email);
      Alert.alert('Success', 'Password reset link sent to your email.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Forgot Password</Text>

      <TextInput
        placeholder="Enter your Registered Email"
        placeholderTextColor="grey"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleEmailReset}>
        <Text style={styles.buttonText}>Send Reset Link</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafe',
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
    color: '#1e1e1e',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 14,
    backgroundColor: 'white',
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  backText: {
    textAlign: 'center',
    color: '#1e90ff',
    fontSize: 14,
    marginTop: 6,
  },
});
