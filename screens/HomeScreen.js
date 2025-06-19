import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function HomeScreen({ navigation }) {

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null, // Hide back arrow
      headerRight: () => (
        <Button
          onPress={async () => {
            await signOut(auth);
            navigation.replace('Login');
          }}
          title="Logout"
          color="red"
        />
      )
    });
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to Home!</Text>
      <Button
        title="Upload Snap"
        onPress={() => navigation.navigate('SnapUpload')}
      />
    </View>
  );
}
