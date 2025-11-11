import {createTheme} from '@mui/material';

export const theme = createTheme({
    palette: {
        primary: {
            main: '#00696B',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#4A6363',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#F4FBFA',
            paper: '#F4FBFA',
        },
        text: {
            primary: '#161D1D',
            secondary: '#3F4949',
        },
        error: {
            main: '#BA1A1A',
            contrastText: '#FFFFFF',
        },
        warning: {
            main: '#FFDAD6',
        },
        success: {
            main: '#4C5F7C',
            contrastText: '#FFFFFF',
        },
        info: {
            main: '#9CF1F2',
            contrastText: '#002020',
        },
    },
    typography: {
        fontFamily: "'Inter', sans-serif",
        h1: {
            fontWeight: 700,
            fontStyle: 'normal',
        },
        h2: {
            fontWeight: 600,
            fontStyle: 'normal',
        },
        h3: {
            fontWeight: 500,
            fontStyle: 'normal',
        },
        h4: {
            fontWeight: 300,
            fontStyle: 'normal',
        },
        body1: {
            fontWeight: 400,
            fontStyle: 'normal',
        },
        body2: {
            fontWeight: 300,
            fontStyle: 'normal',
        },
        button: {
            fontWeight: 700,
            fontStyle: 'normal',
        },
        subtitle1: {
            fontWeight: 400,
            fontStyle: 'italic',
        },
        subtitle2: {
            fontWeight: 500,
            fontStyle: 'italic',
        },
    },
    components: {
        // MuiTextField: {
        //   styleOverrides: {
        //     root: {
        //       fontFamily: 'GeneralSans-Regular',
        //     },
        //   },
        // },
        // MuiInputLabel: {
        //   styleOverrides: {
        //     root: {
        //       fontFamily: 'GeneralSans-Regular',
        //     },
        //   },
        // },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '2rem', // Slightly rounded for modern feel
                    textTransform: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff', // White AppBar for a clean look
                    color: '#1976d2', // Blue text/icons
                    boxShadow: 'none', // Remove shadow for a flat design
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '16px', // Rounded cards
                    // boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)', // Soft shadow for cards
                    padding: '20px', // Spacious padding inside cards
                },
            },
        },
        MuiContainer: {
            styleOverrides: {
                root: {
                    padding: '16px', // Comfortable padding for mobile views
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    color: '#262135', // Blue for primary action icons
                },
            },
        },
        // Add border radius to inputs here
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: '12px', // Rounded corners for input fields
                },
                input: {
                    borderRadius: '12px', // Rounded corners for input fields
                },
            },
        },
        MuiFilledInput: {
            styleOverrides: {
                root: {
                    borderRadius: '12px', // If you're using the filled variant
                },
            },
        },
    },
});
