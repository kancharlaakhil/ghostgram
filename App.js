globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import React from 'react';
import './firebaseConfig'; // ✅ ensure this runs first
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import SnapUploadScreen from './screens/SnapUploadScreen';
import ForgotPasswordScreen from './screens/ForgotPassword';
import AddFriendsScreen from './screens/AddFriendsScreen';
import ChatScreen from './screens/ChatScreen';
import ReceivedRequestsScreen from './screens/ReceivedRequestsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SnapUpload" component={SnapUploadScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="AddFriends" component={AddFriendsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="ReceivedRequests" component={ReceivedRequestsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
