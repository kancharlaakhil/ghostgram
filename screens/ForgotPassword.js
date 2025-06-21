// ForgotPasswordScreen.js

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  sendPasswordResetEmail,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth, db } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export default function ForgotPasswordScreen({ navigation }) {
  const [mode, setMode] = useState('email'); // 'email' or 'phone'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const recaptchaVerifier = useRef(null);

  const handleEmailReset = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your registered email.');
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

  const handleSendOTP = async () => {
    if (!phone.startsWith('+91')) {
      Alert.alert('Invalid Phone', 'Enter phone in +91XXXXXXXXXX format');
      return;
    }

    try {
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        Alert.alert('Error', 'No user found with this phone number.');
        return;
      }

      const result = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaVerifier.current
      );
      setConfirmation(result);
      Alert.alert('OTP Sent', 'Enter the OTP received to reset password.');
    } catch (err) {
      Alert.alert('OTP Error', err.message);
    }
  };

  const handleVerifyOTPAndSendReset = async () => {
    if (!otp || !confirmation) {
      Alert.alert('Missing OTP', 'Please enter the OTP.');
      return;
    }

    try {
      await confirmation.confirm(otp);

      // Get email linked to phone
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const snapshot = await getDocs(q);
      const email = snapshot.docs[0].data().email;

      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', `Password reset link sent to ${email}`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('OTP Error', 'Invalid OTP or phone number.');
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
      />
      <Text style={styles.heading}>Forgot Password</Text>

      <View style={styles.switchWrapper}>
        <TouchableOpacity onPress={() => setMode('email')}>
          <Text style={[styles.switchText, mode === 'email' && styles.selected]}>Use Email</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('phone')}>
          <Text style={[styles.switchText, mode === 'phone' && styles.selected]}>Use Phone</Text>
        </TouchableOpacity>
      </View>

      {mode === 'email' ? (
        <>
          <TextInput
            placeholder="Enter your registered email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
          />
          <Button title="Send Reset Link" onPress={handleEmailReset} />
        </>
      ) : confirmation ? (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            style={styles.input}
            keyboardType="numeric"
          />
          <Button title="Verify OTP & Send Reset Link" onPress={handleVerifyOTPAndSendReset} />
        </>
      ) : (
        <>
          <TextInput
            placeholder="Enter phone number (+91XXXXXXXXXX)"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <Button title="Send OTP" onPress={handleSendOTP} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  heading: { textAlign: 'center', fontSize: 22, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10 },
  switchWrapper: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  switchText: { fontSize: 16, color: 'gray' },
  selected: { color: 'black', fontWeight: 'bold', textDecorationLine: 'underline' },
});
