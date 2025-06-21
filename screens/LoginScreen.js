import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isEmail = (value) => /\S+@\S+\.\S+/.test(value);
  const isPhone = (value) => /^\+91\d{10}$/.test(value); // e.g., +919876543210

  const handleLogin = async () => {
    try {
      let emailToUse = loginId;

      if (isPhone(loginId)) {
        const q = query(collection(db, 'users'), where('phone', '==', loginId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          Alert.alert('Login Failed', 'No user found with this phone number.');
          return;
        }

        const userDoc = snapshot.docs[0].data();
        emailToUse = userDoc.email;
      } else if (!isEmail(loginId)) {
        Alert.alert('Invalid Input', 'Enter a valid email or phone number');
        return;
      }

      const userCred = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCred.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        Alert.alert('Email Not Verified', `Please verify your email before logging in. Verification mail has been sent to ${emailToUse}`,);
        return;
      }
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Login Error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Log In</Text>
      <TextInput
        placeholder="Email or Phone (+91XXXXXXXXXX)"
        value={loginId}
        onChangeText={setLoginId}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
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
      <Button title="Login" onPress={handleLogin} />
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 5,
    paddingRight: 10,
  },
  toggle: {
    paddingHorizontal: 10,
  },
});
