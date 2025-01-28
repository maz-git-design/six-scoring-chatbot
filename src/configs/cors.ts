const { HOST_IP = "localhost" } = process.env;

const corsOptions = {
  origin: "*",
  credentials: true
};

// const hosts = ["*"];

// hosts.forEach(host => {
//   corsOptions.origin.push(`http://${host}`);
//   corsOptions.origin.push(`https://${host}`);
//   if (/.com$/.test(host)) {
//     corsOptions.origin.push(`http://www.${host}`);
//     corsOptions.origin.push(`https://www.${host}`);
//   }
// });

export default corsOptions;
