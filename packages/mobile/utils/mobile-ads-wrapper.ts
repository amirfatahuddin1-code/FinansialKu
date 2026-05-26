import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { RewardedAd as NativeRewardedAd } from 'react-native-google-mobile-ads';

export type RewardedAd = NativeRewardedAd;

let isAdsAvailable = false;
let MobileAds: any;
let RewardedAd: any;
let RewardedAdEventType: any;
let AdEventType: any;
let TestIds: any;
let BannerAd: any;
let BannerAdSize: any;

const hasNativeModule = !!(
  NativeModules.RNGoogleMobileAdsModule ||
  (TurboModuleRegistry && TurboModuleRegistry.get('RNGoogleMobileAdsModule'))
);

if (hasNativeModule) {
  try {
    const ads = require('react-native-google-mobile-ads');
    MobileAds = ads.MobileAds;
    RewardedAd = ads.RewardedAd;
    RewardedAdEventType = ads.RewardedAdEventType;
    AdEventType = ads.AdEventType;
    TestIds = ads.TestIds;
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    isAdsAvailable = true;
  } catch (e) {
    console.warn('Failed to require react-native-google-mobile-ads despite module detection:', e);
    isAdsAvailable = false;
  }
}

if (!isAdsAvailable) {
  console.warn('react-native-google-mobile-ads native module not found. Using simulation mocks.');
  
  MobileAds = () => ({
    initialize: () => Promise.resolve([]),
  });

  RewardedAdEventType = {
    LOADED: 'rewarded_loaded',
    EARNED_REWARD: 'rewarded_earned_reward',
  };

  AdEventType = {
    LOADED: 'loaded',
    ERROR: 'error',
    OPENED: 'opened',
    CLOSED: 'closed',
  };

  TestIds = {
    REWARDED: 'ca-app-pub-3940256099942544/5224354917',
    BANNER: 'ca-app-pub-3940256099942544/6300978111',
  };

  class MockRewardedAd {
    private listeners: { [key: string]: Function[] } = {};
    private adUnitId: string;

    constructor(adUnitId: string) {
      this.adUnitId = adUnitId;
    }

    static createForAdRequest(adUnitId: string) {
      return new MockRewardedAd(adUnitId);
    }

    addAdEventListener(eventType: string, listener: Function) {
      if (!this.listeners[eventType]) {
        this.listeners[eventType] = [];
      }
      this.listeners[eventType].push(listener);
      return () => {
        this.listeners[eventType] = this.listeners[eventType].filter(l => l !== listener);
      };
    }

    private emit(eventType: string, ...args: any[]) {
      if (this.listeners[eventType]) {
        this.listeners[eventType].forEach(l => l(...args));
      }
    }

    load() {
      // Simulate loading delay
      setTimeout(() => {
        this.emit(RewardedAdEventType.LOADED);
      }, 800);
    }

    show() {
      // Simulate watching the ad and earning the reward
      setTimeout(() => {
        this.emit(RewardedAdEventType.EARNED_REWARD, { type: 'coins', amount: 5 });
        this.emit(AdEventType.CLOSED);
      }, 500);
    }
  }

  RewardedAd = MockRewardedAd;

  // Mock BannerAd
  const React = require('react');
  const { View, Text } = require('react-native');
  
  BannerAd = (props: any) => {
    return React.createElement(
      View,
      {
        style: {
          height: 50,
          backgroundColor: '#1e293b',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#334155',
          borderRadius: 8,
          marginVertical: 8,
          ...props.style,
        }
      },
      React.createElement(
        Text,
        { style: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' } },
        '📺 [Simulated Ad Banner]'
      )
    );
  };

  BannerAdSize = {
    ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
    INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER',
    BANNER: 'BANNER',
    LARGE_BANNER: 'LARGE_BANNER',
    MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
    FULL_BANNER: 'FULL_BANNER',
    LEADERBOARD: 'LEADERBOARD',
  };
}

export {
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
  BannerAd,
  BannerAdSize,
  isAdsAvailable,
};
