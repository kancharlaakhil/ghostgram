import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
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
      Alert.alert('Missing Email', 'Please enter your registered email.');
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
        placeholder="Enter your registered email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button title="Send Reset Link" onPress={handleEmailReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  heading: { textAlign: 'center', fontSize: 22, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 },
});
