import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function OnboardingScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [college, setCollege] = useState('');

  const handleSignup = async () => {
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;
        await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        gender,
        college,
        friends: [],
        createdAt: new Date()
        });
        navigation.navigate('Home');
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
    };

  return (
    <View style={styles.container}>
      <Text>Onboarding</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Gender (Male/Female)" value={gender} onChangeText={setGender} style={styles.input} />
      <TextInput placeholder="College" value={college} onChangeText={setCollege} style={styles.input} />
      <Button title="Sign Up" onPress={handleSignup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 5
  }
});