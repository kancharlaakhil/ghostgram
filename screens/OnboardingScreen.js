import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth, db } from '../firebaseConfig';
import {
  signInWithPhoneNumber,
  EmailAuthProvider,
  linkWithCredential,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { collection, doc, getDocs, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';

export default function OnboardingScreen({ navigation }) {
  const recaptchaVerifier = useRef(null);
  const [step, setStep] = useState(1);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [college, setCollege] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isvalid = (value) => /^\+91\d{10}$/.test(value);
  const isvalidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const sendOTP = async () => {
    if (!phoneNumber || !name || !gender || !college) {
      Alert.alert('Missing details', 'Please fill in all details before continuing.');
      return;
    }

    if (!isvalid(phoneNumber)) {
      Alert.alert('Invalid Phone', 'Use +91XXXXXXXXXX format');
      return;
    }

    const q = query(collection(db, 'users'), where('phone', '==', phoneNumber));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      Alert.alert('Phone Exists', 'An account with this phone number already exists.');
      return;
    }

    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.current);
      setConfirmation(result);
      Alert.alert('OTP Sent', 'Enter the code to continue');
      setStep(2);
    } catch (err) {
      Alert.alert('OTP Error', err.message);
    }
  };

  const verifyOTP = async () => {
    if (!otp) {
      Alert.alert('Missing OTP', 'Please enter the OTP sent to your phone.');
      return;
    }
    try {
      const result = await confirmation.confirm(otp);
      setVerifiedUser(result.user);
      Alert.alert('Phone verification successful', 'Proceed to Email and password.');
      setStep(3);
    } catch (err) {
      Alert.alert('OTP Failed', 'Please enter correct OTP.');
    }
  };

  const finishSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing details', 'Please fill in all details before continuing.');
      return;
    }

    if (!isvalidEmail(email)) {
      Alert.alert('Invalid Email', 'Use proper email');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      Alert.alert('Email Exists', 'An account with this Email already exists.');
      return;
    }

    try {
      const emailCred = EmailAuthProvider.credential(email, password);
      const linkedUserCred = await linkWithCredential(verifiedUser, emailCred);

      const user = linkedUserCred.user;

      await sendEmailVerification(user);

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        phone: phoneNumber,
        name,
        gender,
        college,
        email,
        friends: [],
        createdAt: serverTimestamp(),
      });

      Alert.alert('Email Sent', 'Please verify your email to complete registration.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } catch (err) {
      Alert.alert('Signup Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={auth.app.options} />
      <Text style={styles.heading}>Sign Up</Text>

      {step === 1 && (
        <>
          <TextInput
            placeholder="Enter mobile number (+91XXXXXXXXXX)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <TextInput placeholder="Enter Fullname" value={name} onChangeText={setName} style={styles.input} />
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={gender} onValueChange={setGender} style={styles.picker}>
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={college} onValueChange={setCollege} style={styles.picker}>
              <Picker.Item label="Select your College" value="" />
              <Picker.Item label="IIT Bombay" value="IIT Bombay" />
              <Picker.Item label="IIT Delhi" value="IIT Delhi" />
              <Picker.Item label="IIT Madras" value="IIT Madras" />
              <Picker.Item label="IIT Kanpur" value="IIT Kanpur" />
              <Picker.Item label="IIT Kharagpur" value="IIT Kharagpur" />
              <Picker.Item label="IIT Roorkee" value="IIT Roorkee" />
              <Picker.Item label="IIT Hyderabad" value="IIT Hyderabad" />
              <Picker.Item label="IIT Guwahati" value="IIT Guwahati" />
              <Picker.Item label="IIT Indore" value="IIT Indore" />
              <Picker.Item label="IIT BHU(Varanasi)" value="IIT BHU(Varanasi)" />
            </Picker>
          </View>
          <Button title="Send OTP" onPress={sendOTP} />
        </>
      )}

      {step === 2 && (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            style={styles.input}
            keyboardType="numeric"
          />
          <Button title="Verify OTP" onPress={verifyOTP} />
        </>
      )}

      {step === 3 && (
        <>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Set Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
          />
          <Text style={styles.toggleText} onPress={() => setShowPassword((prev) => !prev)}>
            {showPassword ? 'Hide Password' : 'Show Password'}
          </Text>

          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
          />
          <Text style={styles.toggleText} onPress={() => setShowConfirmPassword((prev) => !prev)}>
            {showConfirmPassword ? 'Hide Confirm Password' : 'Show Confirm Password'}
          </Text>

          <Button title="Finish Signup" onPress={finishSignup} />
        </>
      )}

      <Text style={styles.switchText} onPress={() => navigation.replace('Login')}>
        Already have an account? Log In
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5 },
  heading: { textAlign: 'center', fontSize: 20, marginBottom: 10 },
  switchText: { marginTop: 20, textAlign: 'center', color: 'blue' },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', marginVertical: 5 },
  picker: { height: 50, width: '100%' },
  toggleText: { color: 'blue', marginBottom: 10, textAlign: 'right' },
});
