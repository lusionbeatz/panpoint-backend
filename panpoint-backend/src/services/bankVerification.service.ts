import { BankDetails } from '../models/BankDetails.model';
import { emitToUser } from '../config/socket';

/**
 * Simulated async bank verification.
 *
 * Behaviour:
 *   - Waits 5 seconds (simulates network latency)
 *   - 80% chance  -> verified
 *   - 20% chance  -> failed
 *   - Updates BankDetails.verificationStatus in DB
 *   - Emits 'bank_verification_result' socket event to shop owner
 */
export const bankVerificationService = async (
  shopId: string,
  ownerId: string
): Promise<void> => {
  // Simulate async verification delay (5 seconds)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const isVerified = Math.random() < 0.8;
  const status = isVerified ? 'verified' : 'failed';

  await BankDetails.findOneAndUpdate(
    { shop: shopId },
    { verificationStatus: status }
  );

  emitToUser(ownerId, 'bank_verification_result', {
    shopId,
    status,
    message: isVerified
      ? 'Your bank account has been verified successfully.'
      : 'Bank verification failed. Please re-submit correct bank details.',
  });
};
