import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('password');
  const [loginId, setLoginId] = useState('');
  const [phnum, setPhnum] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const isEmail = (val) => /\S+@\S+\.\S+/.test(val);
  const isPhone = (val) => /^\+91\d{10}$/.test(val);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          navigation.replace('Home');
        }
      }
    });
    return unsubscribe;
  }, []);

  const handlePasswordLogin = async () => {
    try {
      let emailToUse = loginId;

      if (isPhone(loginId)) {
        const q = query(collection(db, 'users'), where('phone', '==', loginId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          Alert.alert('Login Failed', 'Invalid credentials');
          return;
        }
        const userDoc = snapshot.docs[0].data();
        emailToUse = userDoc.email;
      } else if (!isEmail(loginId)) {
        Alert.alert('Invalid Input', 'Use a valid email or +91XXXXXXXXXX');
        return;
      }

      const userCred = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCred.user;

      if (!user.emailVerified) {
        await user.sendEmailVerification();
        Alert.alert('Email Not Verified', `Verification link sent to ${emailToUse}`);
        return;
      }

      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Login Error', err.message);
    }
  };

  const sendOTP = async () => {
    if (!isPhone(phnum)) {
      Alert.alert('Invalid Phone', 'Use format +91XXXXXXXXXX');
      return;
    }

    const q = query(collection(db, 'users'), where('phone', '==', phnum));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      Alert.alert('No Account', 'No user with this phone');
      return;
    }

    try {
      console.log('Phone Number:', phnum);
      console.log('Auth Object:', auth);
      const result = await signInWithPhoneNumber(auth, phnum);
      setConfirmation(result);
      Alert.alert('OTP Sent', 'Check your messages');
    } catch (err) {
      Alert.alert('OTP Error', err.message);
    }
  };

  const confirmOTP = async () => {
    if (!otp || !confirmation) {
      Alert.alert('Enter OTP', 'Please enter the code sent to your phone');
      return;
    }

    try {
      const result = await confirmation.confirm(otp);
      const user = result.user;

      const q = query(collection(db, 'users'), where('phone', '==', phnum));
      const snapshot = await getDocs(q);
      const userEmail = snapshot.docs[0]?.data()?.email;

      await user.reload();
      if (!user.emailVerified) {
        await user.sendEmailVerification();
        Alert.alert('Email Not Verified', `Check your inbox: ${userEmail}`);
        navigation.replace('Login');
        return;
      }

      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Invalid OTP', 'Try again');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Log In</Text>

      {mode === 'password' ? (
        <>
          <TextInput
            placeholder="Email or +91XXXXXXXXXX"
            value={loginId}
            onChangeText={setLoginId}
            style={styles.input}
          />
          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1 }]}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.toggle}>
              <Text style={{ color: 'blue' }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <Button title="Login" onPress={handlePasswordLogin} />
        </>
      ) : (
        <>
          <TextInput
            placeholder="+91XXXXXXXXXX"
            value={phnum}
            onChangeText={setPhnum}
            style={styles.input}
          />
          {confirmation && (
            <TextInput
              placeholder="Enter OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              style={styles.input}
            />
          )}
          <Button title={confirmation ? 'Login' : 'Send OTP'} onPress={confirmation ? confirmOTP : sendOTP} />
        </>
      )}

      <Text style={styles.toggleText} onPress={() => {
        setMode(mode === 'password' ? 'otp' : 'password');
        setConfirmation(null); setOtp('');
      }}>
        {mode === 'password' ? 'Login with OTP Instead' : 'Login with Password Instead'}
      </Text>

      <Text style={styles.switchText} onPress={() => navigation.navigate('ForgotPassword')}>Forgot Password?</Text>
      <Text style={styles.switchText} onPress={() => navigation.replace('Onboarding')}>Don't have an account? Sign Up</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5 },
  heading: { textAlign: 'center', fontSize: 20, marginBottom: 10 },
  switchText: { marginTop: 20, textAlign: 'center', color: 'blue' },
  toggleText: { marginTop: 15, textAlign: 'center', color: 'green' },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 5,
    paddingRight: 10,
  },
  toggle: { paddingHorizontal: 10 },
});
