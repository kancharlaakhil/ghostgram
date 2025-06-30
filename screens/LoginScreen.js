import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import firestore from '@react-native-firebase/firestore';
import { onAuthStateChanged } from '@react-native-firebase/auth';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('password'); // 'password' or 'otp'
  const [loginId, setLoginId] = useState('');
  const [phnum, setPhnum] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const isEmail = (val) => /\S+@\S+\.\S+/.test(val);
  const isPhone = (val) => /^\+91\d{10}$/.test(val);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), async (user) => {
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
        const snapshot = await firestore()
          .collection('users')
          .where('phone', '==', loginId)
          .get();

        if (snapshot.empty) {
          Alert.alert('Login Failed', 'Invalid credentials');
          return;
        }
        const userDoc = snapshot.docs[0].data();
        emailToUse = userDoc.email;
      } else if (!isEmail(loginId)) {
        Alert.alert('Invalid Input', 'Enter a valid email or +91XXXXXXXXXX');
        return;
      }

      const userCred = await auth().signInWithEmailAndPassword(emailToUse, password);
      const user = userCred.user;

      if (!user.emailVerified) {
        await user.sendEmailVerification();
        Alert.alert('Email Not Verified', `Verification link sent to ${emailToUse}`);
        return;
      }

      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Login Failed', 'Password Incorrect');
    }
  };

  const sendOTP = async () => {
    if (!isPhone(phnum)) {
      Alert.alert('Invalid Phone', 'Use format +91XXXXXXXXXX');
      return;
    }

    const snapshot = await firestore()
      .collection('users')
      .where('phone', '==', phnum)
      .get();

    if (snapshot.empty) {
      Alert.alert('No Account', 'No user with this phone');
      return;
    }

    try {
      const confirmationResult = await auth().signInWithPhoneNumber(phnum);
      setConfirmation(confirmationResult);
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

      const snapshot = await firestore()
        .collection('users')
        .where('phone', '==', phnum)
        .get();

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
            placeholder="Email or Phone(+91XXXXXXXXXX)"
            placeholderTextColor='grey'
            value={loginId}
            onChangeText={setLoginId}
            style={styles.input}
          />
          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Password"
              placeholderTextColor='grey'
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
            placeholderTextColor='grey'
            value={phnum}
            onChangeText={setPhnum}
            style={styles.input}
          />
          {confirmation && (
            <TextInput
              placeholder="Enter OTP"
              placeholderTextColor='grey'
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              style={styles.input}
            />
          )}
          <Button title={confirmation ? 'Login' : 'Send OTP'} onPress={confirmation ? confirmOTP : sendOTP} />
        </>
      )}

      <Text
        style={styles.toggleText}
        onPress={() => {
          setMode(mode === 'password' ? 'otp' : 'password');
          setConfirmation(null);
          setOtp('');
        }}
      >
        {mode === 'password' ? 'Login with OTP Instead' : 'Login with Password Instead'}
      </Text>

      <Text style={styles.switchText} onPress={() => navigation.navigate('ForgotPassword')}>
        Forgot Password?
      </Text>
      <Text style={styles.switchText} onPress={() => navigation.replace('Onboarding')}>
        Don't have an account? Sign Up
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  heading: {
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 20,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: '#fff',
    paddingLeft: 10,
  },
  toggle: {
    paddingHorizontal: 10,
  },
  toggleText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#007AFF',
    fontWeight: '500',
  },
  switchText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007AFF',
    fontWeight: '500',
  },
});

