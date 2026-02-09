
 const setCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,       // 🔥 REQUIRED on Render
    sameSite: "None",   // 🔥 REQUIRED for cross-site
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export default setCookie;