globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import React from 'react';
import './firebaseConfig'; // ✅ ensure this runs first
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MenuProvider } from 'react-native-popup-menu';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import SnapUploadScreen from './screens/SnapUploadScreen';
import ForgotPasswordScreen from './screens/ForgotPassword';
import AddFriendsScreen from './screens/AddFriendsScreen';
import ChatScreen from './screens/ChatScreen';
import ReceivedRequestsScreen from './screens/ReceivedRequestsScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <MenuProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SnapUpload" component={SnapUploadScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="AddFriends" component={AddFriendsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="ReceivedRequests" component={ReceivedRequestsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </MenuProvider>
  );
}
