import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import ProfilePicker from '@/components/ProfilePicker';

type Props = NativeStackScreenProps<RootStackParamList, 'SwitchProfile'>;

export default function SwitchProfileScreen({ navigation }: Props) {
  return (
    <ProfilePicker
      onDone={() => navigation.navigate('Home')}
    />
  );
}
