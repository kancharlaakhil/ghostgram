import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { query, collection, where, getDocs } from 'firebase/firestore';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const isvalidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleEmailReset = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your registered email.');
      return;
    }

    if(!isvalidEmail(email)){
      Alert.alert('Invalid format','Please enter correct Email format');
      return;
    }

    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      Alert.alert('No User', 'No account found with this Email');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
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
