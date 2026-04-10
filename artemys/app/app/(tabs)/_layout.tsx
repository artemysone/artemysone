import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

export default function TabLayout() {
  const { profile } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.labeledTab}>
              <Ionicons name="home-outline" size={size} color={color} />
              <Text style={[styles.tabLabel, { color }]}>Feed</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.labeledTab}>
              <Ionicons name="search-outline" size={size} color={color} />
              <Text style={[styles.tabLabel, { color }]}>Explore</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: () => (
            <View style={styles.createButton}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.labeledTab}>
              <Ionicons name="notifications-outline" size={size} color={color} />
              <Text style={[styles.tabLabel, { color }]}>Alerts</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.avatarRing : undefined}>
              <Avatar
                uri={profile?.avatar_url}
                name={profile?.name ?? '?'}
                containerSize={32}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile-edit"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="project/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="[handle]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingTop: 8,
    paddingBottom: 12,
  },
  labeledTab: {
    alignItems: 'center',
    gap: 2,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
  },
  avatarRing: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 99,
    padding: 1.5,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
