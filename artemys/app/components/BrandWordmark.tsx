import { Text, Platform } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '@/constants/Typography';

export function BrandWordmark() {
  const textElement = (
    <Text style={{ fontFamily: fonts.brandScript, fontSize: 50, lineHeight: 52, textAlign: 'center' }}>
      Artemys
    </Text>
  );

  if (Platform.OS === 'web') {
    return (
      <Text
        style={{
          fontFamily: fonts.brandScript,
          fontSize: 50,
          // @ts-expect-error web-only style
          backgroundImage: 'linear-gradient(90deg, #D4607A, #E89860)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Artemys
      </Text>
    );
  }

  return (
    <MaskedView maskElement={textElement}>
      <LinearGradient
        colors={['#D4607A', '#E89860']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={{ fontFamily: fonts.brandScript, fontSize: 50, lineHeight: 52, opacity: 0 }}>
          Artemys
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
