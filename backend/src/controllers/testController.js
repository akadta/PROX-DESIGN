exports.test = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Worked !",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};
