const config = require('./src/config/config');
require('dotenv').config();

// Construct the service account object
const serviceAccount = {
  type: config.serviceAccount.type,
  project_id: config.serviceAccount.project_id,
  private_key_id: config.serviceAccount.private_key_id,
  private_key: config.serviceAccount.private_key,
  client_email: config.serviceAccount.client_email,
  client_id: config.serviceAccount.client_id,
  auth_uri: config.serviceAccount.auth_uri,
  token_uri: config.serviceAccount.token_uri,
  auth_provider_x509_cert_url: config.serviceAccount.auth_provider_x509_cert_url,
  client_x509_cert_url: config.serviceAccount.client_x509_cert_url,
  universe_domain: config.serviceAccount.universe_domain,
};

module.exports = serviceAccount;
