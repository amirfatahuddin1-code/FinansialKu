import { Platform } from 'react-native';

const AD_UNIT_IDS: Record<string, { banner: string; rewarded: string }> = {
  android: {
    banner: 'ca-app-pub-2634705417877623/2098554452',
    rewarded: 'ca-app-pub-2634705417877623/6315103854',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
  default: {
    banner: 'ca-app-pub-2634705417877623/2098554452',
    rewarded: 'ca-app-pub-2634705417877623/6315103854',
  },
};

const os = Platform.OS as keyof typeof AD_UNIT_IDS;
export const ADS = {
  bannerAdUnitId: AD_UNIT_IDS[os]?.banner || AD_UNIT_IDS.default.banner,
  rewardedAdUnitId: AD_UNIT_IDS[os]?.rewarded || AD_UNIT_IDS.default.rewarded,
};
