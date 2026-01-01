import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

const NFC_PAYLOAD = 'BROKE-IS-GREAT';

export async function initNfc(): Promise<boolean> {
  try {
    const isSupported = await NfcManager.isSupported();
    if (isSupported) {
      await NfcManager.start();
    }
    return isSupported;
  } catch (error) {
    console.error('NFC init error:', error);
    return false;
  }
}

export async function readNfcTag(): Promise<{ success: boolean; isValid: boolean; message?: string }> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();

    if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
      return { success: true, isValid: false, message: 'No NDEF message found on tag' };
    }

    const record = tag.ndefMessage[0];
    const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));

    const isValid = payload === NFC_PAYLOAD;
    return {
      success: true,
      isValid,
      message: isValid ? 'Valid Broke tag detected' : 'Invalid tag - not a Broke tag',
    };
  } catch (error: any) {
    if (error.message?.includes('cancelled')) {
      return { success: false, isValid: false, message: 'NFC scan cancelled' };
    }
    return { success: false, isValid: false, message: `NFC read error: ${error.message}` };
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export async function writeNfcTag(): Promise<{ success: boolean; message: string }> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);

    const bytes = Ndef.encodeMessage([Ndef.textRecord(NFC_PAYLOAD)]);

    if (bytes) {
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      return { success: true, message: 'Tag written successfully!' };
    }

    return { success: false, message: 'Failed to encode message' };
  } catch (error: any) {
    if (error.message?.includes('cancelled')) {
      return { success: false, message: 'NFC write cancelled' };
    }
    return { success: false, message: `NFC write error: ${error.message}` };
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export function cleanupNfc() {
  NfcManager.cancelTechnologyRequest();
}
