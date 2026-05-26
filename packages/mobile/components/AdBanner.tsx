import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from '@/utils/mobile-ads-wrapper';
import { ADS } from '@/constants/Ads';

export default function AdBanner() {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        unitId={__DEV__ ? TestIds.BANNER : ADS.bannerAdUnitId}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
