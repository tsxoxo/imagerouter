import React, { useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import GridList from "@material-ui/core/GridList";
import GridListTile from "@material-ui/core/GridListTile";
import GridListTileBar from "@material-ui/core/GridListTileBar";
import IconButton from "@material-ui/core/IconButton";
import StarBorderIcon from "@material-ui/icons/StarBorder";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-around",
        overflow: "hidden",
        backgroundColor: theme.palette.background.paper,
    },
    gridList: {
        flexWrap: "nowrap",
        // Promote the list into his own layer on Chrome. This cost memory but helps keeping high FPS.
        transform: "translateZ(0)",
    },
    title: {
        color: theme.palette.primary.light,
    },
    titleBar: {
        background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)",
    },
}));

const Gallery = ({ images }) => {
    const classes = useStyles();

    return (
        <div className={classes.root}>
            <GridList className={classes.gridList} cols={1.5}>
                {images &&
                    images.map((image) => {
                        return image.img_url ? (
                            <GridListTile
                                key={image.id + image.img_lat + image.img_lng}
                            >
                                <img
                                    src={image.img_url}
                                    alt={image.img_title}
                                />
                                <GridListTileBar
                                    title={image.img_title}
                                    classes={{
                                        root: classes.titleBar,
                                        title: classes.title,
                                    }}
                                    actionIcon={
                                        <IconButton
                                            aria-label={`star ${image.img_title}`}
                                        >
                                            <StarBorderIcon
                                                className={classes.title}
                                            />
                                        </IconButton>
                                    }
                                />
                            </GridListTile>
                        ) : null;
                    })}
            </GridList>
        </div>
    );
};

export default Gallery;
