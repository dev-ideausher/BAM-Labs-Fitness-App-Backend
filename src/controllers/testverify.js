const {
  initializeGoogleAuth,
  verifyPurchase,
} = require("../microservices/inappverfication");

const verifyPurchaseTest = async (purchaseToken, productId) => {
  try {
    const androidPublisher = await initializeGoogleAuth();

    const packageName = "com.iu.bam_fitness_app";
    const result = await verifyPurchase(
      androidPublisher,
      packageName,
      productId,
      purchaseToken
    );

    if (result.success) {
    //   console.log("Purchase verified successfully:", result.data);
      return { success: true, data: result.data };
    } else {
      console.error("Purchase verification failed:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error during testing:", {
      message: error.message,
      stack: error.stack,
    });
  }
};

module.exports = { verifyPurchaseTest };
