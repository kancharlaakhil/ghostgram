import React, { useEffect,useRef, useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
  const recaptchaVerifier = useRef(null);
  const [mode, setMode] = useState('password'); // 'password' or 'otp'

  const [loginId, setLoginId] = useState('');
  const [phnum, setPhnum] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const isEmail = (value) => /\S+@\S+\.\S+/.test(value);
  const isPhone = (value) => /^\+91\d{10}$/.test(value);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.emailVerified) {
          navigation.replace('Home');
        } else {
          navigation.replace('Login');
        }
      }
    });

    return unsubscribe;
  }, []);

  // ---------------------- PASSWORD LOGIN ----------------------
  const handlePasswordLogin = async () => {
    try {
      let emailToUse = loginId;

      if (isPhone(loginId)) {
        const q = query(collection(db, 'users'), where('phone', '==', loginId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          Alert.alert('Login Failed', 'Invalid Credentials');
          return;
        }

        const userDoc = snapshot.docs[0].data();
        emailToUse = userDoc.email;
      } else if (!isEmail(loginId)) {
        Alert.alert('Invalid Input', 'Enter a valid Email or Phone (+91XXXXXXXXXX)');
        return;
      }

      const userCred = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCred.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        Alert.alert('Email Not Verified', `Please verify your email. A link has been sent to: ${emailToUse}`);
        return;
      }

      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Login Error', 'Invalid Credentials');
    }
  };

  // ---------------------- SEND OTP ----------------------
  const sendOTP = async () => {
    if (!isPhone(phnum)) {
      Alert.alert('Invalid Phone', 'Enter a valid phone number in +91XXXXXXXXXX format');
      return;
    }

    const q = query(collection(db, 'users'), where('phone', '==', phnum));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      Alert.alert('No User', 'No account found with this phone number');
      return;
    }

    try {
      const result = await signInWithPhoneNumber(auth, phnum, recaptchaVerifier.current);
      setConfirmation(result);
      Alert.alert('OTP Sent', 'Check your SMS for the code');
    } catch (err) {
      Alert.alert('OTP Error', err.message);
    }
  };

  // ---------------------- CONFIRM OTP ----------------------
  const confirmOTP = async () => {
    if (!otp || !confirmation) {
      Alert.alert('Missing OTP', 'Please enter the OTP sent to your phone.');
      return;
    }

    try {
      const result = await confirmation.confirm(otp);
      const user = result.user;

      const q = query(collection(db, 'users'), where('phone', '==', phnum));
      const snapshot = await getDocs(q);
      const userDoc = snapshot.docs[0].data();
      const userEmail = userDoc.email;

      await user.reload();
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        Alert.alert('Email Not Verified', `Please verify your email before logging in. A link has been sent to: ${userEmail}`);
        navigation.replace('Login');
        return;
      }
      
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Invalid OTP', 'Please enter the correct OTP');
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={auth.app.options} />

      <Text style={styles.heading}>Log In</Text>

      {mode === 'password' ? (
        <>
          <TextInput
            placeholder='Email or Phone (+91XXXXXXXXXX)'
            value={loginId}
            onChangeText={setLoginId}
            style={styles.input}
            keyboardType='email-address'
            autoCapitalize="none"
          />
          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1 }]}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.toggle}>
              <Text style={{ color: 'blue' }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <Button title="Login" onPress={handlePasswordLogin} />
        </>
      ) : (
        <>
          <TextInput
            placeholder='Phone Number (+91XXXXXXXXXX)'
            value={phnum}
            onChangeText={setPhnum}
            style={styles.input}
            keyboardType='phone-pad'
            autoCapitalize="none"
          />
          {confirmation && (
            <TextInput
              placeholder="Enter OTP"
              value={otp}
              onChangeText={setOtp}
              style={styles.input}
              keyboardType="numeric"
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
