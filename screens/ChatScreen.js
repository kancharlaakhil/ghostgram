import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Camera, useCameraPermission, getCameraDevice } from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import FaceDetection from '@react-native-ml-kit/face-detection';
import {
  Canvas,
  Image as SkiaImage,
  useImage,
  Group,
  Skia,
  Blur,
} from '@shopify/react-native-skia';
import ViewShot from 'react-native-view-shot';
import moment from 'moment';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen({ route }) {
  const { chatId } = route.params;
  const currentUid = auth().currentUser.uid;
  const cameraRef = useRef(null);
  const scrollRef = useRef(null);
  const viewShotRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraPosition, setCameraPosition] = useState('back');
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [faces, setFaces] = useState([]);
  const [facesBlurred, setFacesBlurred] = useState(false);
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [canReveal, setCanReveal] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [otherName, setOtherName] = useState('Anonymous');
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const imageSkia = useImage(photoUri || '');
  const { requestPermission: requestCam } = useCameraPermission();
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, cameraPosition);

  useEffect(() => {
    requestCam();
    ImagePicker.requestMediaLibraryPermissionsAsync();
  }, []);

  useEffect(() => {
    const unsub = firestore()
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const grouped = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = data.timestamp?.toDate?.() || new Date();
          const dateKey = moment(date).format('YYYY-MM-DD');
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push({ id: doc.id, ...data });
        });
        setMessages(grouped);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
      });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    const initChatData = async () => {
      const chatRef = firestore().collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();
      const chatData = chatDoc.data();
      const participants = chatData.participants;
      const otherUid = participants.find(uid => uid !== currentUid);

      const [meDoc, otherDoc] = await Promise.all([
        firestore().collection('users').doc(currentUid).get(),
        firestore().collection('users').doc(otherUid).get(),
      ]);

      const myName = meDoc.data().name;
      setUserName(myName);

      const myRevealed = chatData[`${currentUid}_revealed`] || false;
      const otherRevealed = chatData[`${otherUid}_revealed`] || false;

      const isAlreadyFriends =
        meDoc.data().friends?.includes(otherUid) && otherDoc.data().friends?.includes(currentUid);

      // 🔁 Auto add both to friend list if both have revealed and aren't already friends
      if (myRevealed && otherRevealed && !isAlreadyFriends) {
        await Promise.all([
          firestore().collection('users').doc(currentUid).update({
            friends: firestore.FieldValue.arrayUnion(otherUid),
          }),
          firestore().collection('users').doc(otherUid).update({
            friends: firestore.FieldValue.arrayUnion(currentUid),
          }),
        ]);
      }

      // ✅ Display name logic
      setOtherName(otherRevealed ? chatData[`${otherUid}_name`] : 'Anonymous');

      // 🔐 Anonymous/reveal state logic
      if (isAlreadyFriends || (myRevealed && otherRevealed)) {
        setIsAnonymous(false);
        setCanReveal(false);
        setHasRevealed(true);
      } else {
        setHasRevealed(myRevealed);
        setIsAnonymous(!myRevealed);
        setCanReveal(!myRevealed);
      }
    };

    initChatData();
  }, [chatId]);

  const revealIdentity = async () => {
    const chatRef = firestore().collection('chats').doc(chatId);
    await chatRef.update({
      [`${currentUid}_revealed`]: true,
      [`${currentUid}_name`]: userName,
    });
    setHasRevealed(true);
    setIsAnonymous(false);
    setCanReveal(false);
  };

  const manipulateImage = async (uri) => {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 480 } }], {
      compress: 0.5,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  };

  const uploadAndSendImage = async () => {
    if (isAnonymous && !facesBlurred) {
      Alert.alert('Face Blur Required', 'You must blur faces to send anonymous images.');
      return;
    }

    setUploading(true);
    try {
      let uri;

      if (facesBlurred && viewShotRef.current) {
        uri = await viewShotRef.current.capture();
      } else {
        uri = await manipulateImage(photoUri);
      }

      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await firestore().collection('chats').doc(chatId).collection('messages').add({
        text: '',
        imageBase64: base64Data,
        senderId: currentUid,
        senderName: isAnonymous ? 'Anonymous' : userName,
        isAnonymous,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      setPhotoUri(null);
      setFaces([]);
      setFacesBlurred(false);
      setShowCamera(false);
    } catch (err) {
      Alert.alert('Send Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await firestore().collection('chats').doc(chatId).collection('messages').add({
        text: input.trim(),
        senderId: currentUid,
        senderName: isAnonymous ? 'Anonymous' : userName,
        isAnonymous,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
      setInput('');
    } catch {
      Alert.alert('Error sending message');
    }
  };

  const toggleCamera = () => {
    setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'));
    setCameraReady(false);
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off', qualityPrioritization: 'quality' });
      const uri = photo.path.startsWith('file://') ? photo.path : 'file://' + photo.path;
      setPhotoUri(uri);
      const detected = await FaceDetection.detect(uri);
      setFaces(detected.map(f => f.frame));
      setShowCamera(false);
    } catch (err) {
      Alert.alert('Photo Error', err.message);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        const detected = await FaceDetection.detect(uri);
        setFaces(detected.map(f => f.frame));
        setShowCamera(false);
      }
    } catch (err) {
      Alert.alert('Error picking image');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {canReveal && <Button title="Reveal My Identity" onPress={revealIdentity} />}

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {Object.keys(messages).map(date => (
              <View key={date}>
                <Text style={styles.dateSeparator}>{moment(date).format('MMM D, YYYY')}</Text>
                {messages[date].map(item => (
                  <View key={item.id} style={styles.messageItem}>
                    <Text style={styles.messageText}>
                      <Text style={styles.bold}>{item.senderName || 'User'}: </Text>
                      {item.text}
                    </Text>
                    {item.imageBase64 && (
                      <TouchableOpacity onPress={() => setSelectedImage(`data:image/jpeg;base64,${item.imageBase64}`)}>
                        <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.messageImage} />
                      </TouchableOpacity>
                    )}
                    <Text style={styles.timestamp}>{moment(item.timestamp?.toDate?.()).format('h:mm A')}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <Modal visible={!!selectedImage} transparent>
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedImage(null)}>
              <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
            </Pressable>
          </Modal>

          {!photoUri && !showCamera && (
            <View style={styles.buttonRow}>
              <Button title="Open Camera" onPress={() => setShowCamera(true)} />
              <Button title="Choose from Gallery" onPress={pickFromGallery} />
            </View>
          )}

          {showCamera && device && (
            <>
              <Camera
                ref={cameraRef}
                style={styles.camera}
                device={device}
                isActive
                photo
                onInitialized={() => setCameraReady(true)}
              />
              <View style={styles.buttonRow}>
                <Button title="Take Photo" onPress={takePhoto} disabled={!cameraReady} />
                <Button title="Flip" onPress={toggleCamera} />
                <Button title="Close" onPress={() => setShowCamera(false)} />
              </View>
            </>
          )}

          {photoUri && (
            <>
              <ViewShot ref={viewShotRef} style={styles.canvas} options={{ format: 'jpg', quality: 0.8 }}>
                <Canvas style={styles.canvas}>
                  <SkiaImage image={imageSkia} x={0} y={0} width={300} height={400} />
                  {facesBlurred &&
                    faces.map((face, i) => {
                      const { left, top, width, height } = face;
                      if (width <= 0 || height <= 0) return null;
                      const path = Skia.Path.Make();
                      path.addRect({ x: left, y: top, width, height });
                      return (
                        <Group key={i} clip={{ path, op: 'intersect' }}>
                          <SkiaImage image={imageSkia} x={0} y={0} width={300} height={400}>
                            <Blur blur={20} />
                          </SkiaImage>
                        </Group>
                      );
                    })}
                </Canvas>
              </ViewShot>

              <View style={styles.buttonRow}>
                <Button title="Retake" onPress={() => setPhotoUri(null)} />
                {faces.length > 0 && (
                  <Button
                    title={facesBlurred ? 'Unblur Faces' : 'Blur Faces'}
                    onPress={() => setFacesBlurred(prev => !prev)}
                  />
                )}
                <Button title="Send Image" onPress={uploadAndSendImage} />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Type a message..."
              value={input}
              onChangeText={setInput}
              style={styles.input}
            />
            <Button title="Send" onPress={sendMessage} />
          </View>

          {uploading && (
            <View style={styles.uploading}>
              <ActivityIndicator size="large" color="green" />
              <Text>Uploading...</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#f9fafe',
    padding: 10,
    paddingBottom: 5,
  },
  messageItem: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#222',
  },
  bold: {
    fontWeight: '600',
    color: '#1e90ff',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  dateSeparator: {
    textAlign: 'center',
    color: '#777',
    marginVertical: 10,
    fontWeight: '600',
    fontSize: 13,
  },
  camera: {
    width: '100%',
    height: 400,
    borderRadius: 14,
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    paddingHorizontal: 6,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 8,
    resizeMode: 'cover',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: 300,
    height: 400,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    fontSize: 15,
    backgroundColor: '#fefefe',
    marginRight: 10,
  },
});

