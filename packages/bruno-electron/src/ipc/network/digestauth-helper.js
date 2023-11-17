const crypto = require('crypto');

function isStrPresent(str) {
  return str && str !== '' && str !== 'undefined';
}

function stripQuotes(str) {
  return str.replace(/"/g, '');
}

function containsDigestHeader(response) {
  const authHeader = response?.headers?.['www-authenticate'];
  return authHeader ? authHeader.trim().toLowerCase().startsWith('digest') : false;
}

function containsAuthorizationHeader(originalRequest) {
  return Boolean(originalRequest.headers['Authorization']);
}

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

function addDigestInterceptor(axiosInstance, request) {
  const { username, password } = request.digestConfig;

  console.debug(request);

  if (!isStrPresent(username) || !isStrPresent(password)) {
    console.warn('Required Digest Auth fields are not present');
    return;
  }

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const originalRequest = error.config;

      if (
        error.response?.status === 401 &&
        containsDigestHeader(error.response) &&
        !containsAuthorizationHeader(originalRequest)
      ) {
        console.debug(error.response.headers['www-authenticate']);

        const authDetails = error.response.headers['www-authenticate']
          .split(', ')
          .map((v) => v.split('=').map(stripQuotes))
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
        console.debug(authDetails);

        const nonceCount = '00000001';
        const cnonce = crypto.randomBytes(24).toString('hex');

        if (authDetails.algorithm.toUpperCase() !== 'MD5') {
          console.warn(`Unsupported Digest algorithm: ${algo}`);
          return Promise.reject(error);
        }
        const HA1 = md5(`${username}:${authDetails['Digest realm']}:${password}`);
        const HA2 = md5(`${request.method}:${request.url}`);
        const response = md5(`${HA1}:${authDetails.nonce}:${nonceCount}:${cnonce}:auth:${HA2}`);

        const authorizationHeader =
          `Digest username="${username}",realm="${authDetails['Digest realm']}",` +
          `nonce="${authDetails.nonce}",uri="${request.url}",qop="auth",algorithm="${authDetails.algorithm}",` +
          `response="${response}",nc="${nonceCount}",cnonce="${cnonce}"`;
        originalRequest.headers['Authorization'] = authorizationHeader;
        console.debug(`Authorization: ${originalRequest.headers['Authorization']}`);

        delete originalRequest.digestConfig;
        return axiosInstance(originalRequest);
      }

      return Promise.reject(error);
    }
  );
}

module.exports = { addDigestInterceptor };
