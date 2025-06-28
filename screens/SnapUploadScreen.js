import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Button,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import FaceDetection from '@react-native-ml-kit/face-detection';
import * as ImageManipulator from 'expo-image-manipulator';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

export default function SnapUploadScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const device = useCameraDevices('back');
  const { hasPermission: camPerm, requestPermission: requestCam } = useCameraPermission();
  const { hasPermission: micPerm, requestPermission: requestMic } = useMicrophonePermission();


  useEffect(() => {
    (async () => {
      const camStatus = await requestCam();
      const micStatus = await requestMic();
      console.log('Camera permission:', camStatus, 'Mic permission:', micStatus);
    })();
  }, []);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'quality',
      });

      const uri = 'file://' + photo.path;
      setPhotoUri(uri);
    } catch (err) {
      console.error('Photo capture error:', err);
      Alert.alert('Error', 'Could not capture photo.');
    }
  };

  const blurFacesAndUpload = async () => {
    if (!photoUri) return;

    setUploading(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(photoUri, [{ resize: { width: 720 } }]);
      const faces = await FaceDetection.detectFromFile(resized.uri);

      let blurredUri = resized.uri;

      for (const face of faces) {
        const { left, top, width, height } = face.bounds;

        const croppedBlurred = await ImageManipulator.manipulateAsync(
          blurredUri,
          [
            { crop: { originX: left, originY: top, width, height } },
            { resize: { width: 10, height: 10 } },
            { resize: { width, height } },
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );

        blurredUri = croppedBlurred.uri;
      }

      const fileName = `${Date.now()}.jpg`;
      const filePath = `snaps/${auth().currentUser.uid}/${fileName}`;
      const ref = storage().ref(filePath);

      await ref.putFile(blurredUri);
      const downloadURL = await ref.getDownloadURL();

      await firestore().collection('snaps').add({
        from: auth().currentUser.uid,
        imageUrl: downloadURL,
        genderFilter: 'both',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Snap uploaded with blurred faces!');
      setPhotoUri(null);
      navigation.goBack();
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Failed to upload snap.');
    } finally {
      setUploading(false);
    }
  };

  if (!camPerm || !micPerm || !device) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="blue" />
        <Text>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={true}
            photo={true}
          />
          <Button title="Take Photo" onPress={takePhoto} />
        </>
      ) : (
        <>
          <Image source={{ uri: photoUri }} style={styles.image} />
          <Button title="Blur Faces & Upload" onPress={blurFacesAndUpload} />
          <Button title="Retake" onPress={() => setPhotoUri(null)} />
        </>
      )}
      {uploading && (
        <View style={styles.uploading}>
          <ActivityIndicator size="large" color="green" />
          <Text>Uploading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  camera: { flex: 1 },
  image: { width: '100%', height: 500, marginVertical: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
  },
});
