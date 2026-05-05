export const colors = {
  primary: "#FF4458",
  primaryLight: "rgba(255,68,88,0.1)",
  background: "#F7F7F8",
  surface: "#FFFFFF",
  text: "#1C1C1E",
  textSecondary: "#636366",
  textTertiary: "#AEAEB2",
  border: "#EBEBEB",
  online: "#30D158",
  // backward compat
  card: "#FFFFFF",
  secondary: "#FF7384",
};

export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const globalStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
};
