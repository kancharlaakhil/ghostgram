import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet,Alert } from 'react-native';
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
        Alert.alert(
            'Sign Up Successful!.',
            'Press OK to Login.',
            [
            {
                text: 'OK',
                onPress: () => navigation.replace('Login')
            }
            ]
        );
    } catch (err) {
        Alert.alert('Signup Error', 'Incomplete/Invalid details');
    }
    };

  return (
    <View style={styles.container}>
        <Text style={styles.heading}>SignUp</Text>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput placeholder="Set Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
        <TextInput placeholder="Gender (Male/Female)" value={gender} onChangeText={setGender} style={styles.input} />
        <TextInput placeholder="College" value={college} onChangeText={setCollege} style={styles.input} />
        <Button title="Sign Up" onPress={handleSignup} />
        <Text style={styles.switchText} onPress={() => navigation.replace('Login')}>
            Already have an account? Log In
        </Text>
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
    },
    switchText: { marginTop: 20, color: 'blue', textAlign: 'center' },
    heading: {textAlign:'center'}
});