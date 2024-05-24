export default function () {
  const timestamp = Date.now();
  const testKey = `test-object-key-${timestamp}.txt`;
  const testContent = `This is a test object generated at ${new Date(timestamp).toISOString()}`;
  return { testKey, testContent };
}
