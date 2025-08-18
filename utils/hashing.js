const { hash, compare} = require('bcryptjs');

exports.doHash = (value, saltValue) => {
	const result = hash(value, saltValue);
	return result;
};

//compare password store in the database
exports.doHashValidation = (value, hashedValue) => {
	const result = compare(value, hashedValue);
	return result;
};