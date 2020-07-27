import React from "react";
import CssBaseline from "@material-ui/core/CssBaseline";

import "./App.css";

import Map from "./Map";
import Gallery from "./Gallery";
import {
    AppBar,
    Toolbar,
    Typography,
    Grid,
    Container,
} from "@material-ui/core";

function App() {
    return (
        <>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography style={{ flexGrow: 1 }} variant="h4">
                        ImageRouter
                    </Typography>
                    <nav
                        style={{
                            // width: 500,
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                        }}
                    >
                        My Routes
                    </nav>
                </Toolbar>
            </AppBar>
            <Grid container style={{ height: "100%" }}>
                <Grid item sm={4}>
                    <Gallery />
                </Grid>
                <Grid item sm={8}>
                    <Map />
                </Grid>
            </Grid>
        </>
    );
}

export default App;
