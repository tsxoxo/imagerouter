import React, { useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import GridList from "@material-ui/core/GridList";
import GridListTile from "@material-ui/core/GridListTile";
import GridListTileBar from "@material-ui/core/GridListTileBar";
import IconButton from "@material-ui/core/IconButton";
import StarBorderIcon from "@material-ui/icons/StarBorder";

import mock_api_places_response from "./mockApiPlaceRes";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-around",
        overflowY: "scroll",
        overflowX: "hidden",
        backgroundColor: theme.palette.background.paper,
        height: "94vh",
    },
    gridList: {
        // flexWrap: "nowrap",
        // Promote the list into his own layer on Chrome. This cost memory but helps keeping high FPS.
        transform: "translateZ(0)",
        height: "100%",
    },
    title: {
        color: theme.palette.primary.light,
    },
    titleBar: {
        background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)",
    },
    highlightOnHover: {
        boxSizing: "border-box",
        border: "15px lime solid",
        // boxShadow: "0px 0px 0px 10px black inset",
    },
}));

const Gallery = props => {
    const places = props.places;
    const classes = useStyles();

    useEffect(() => {
        console.log("props.hovered", props.hoveredMapPointIndex);
    }, [props.hoveredMapPointIndex]);

    return (
        <div className={classes.root}>
            <GridList cellHeight={320} className={classes.gridList} cols={1}>
                {places.map((place, ind) => {
                    return place.img_url ? (
                        <GridListTile
                            key={ind}
                            onMouseEnter={() =>
                                props.handleGalleryItemMouseEnter(ind)
                            }
                            onMouseLeave={() =>
                                props.handleGalleryItemMouseLeave(ind)
                            }
                        >
                            <img
                                src={place.img_url}
                                alt={place.img_title}
                                className={
                                    ind === props.hoveredMapPointIndex
                                        ? classes.highlightOnHover
                                        : {}
                                }
                            />
                            <GridListTileBar
                                title={place.img_title}
                                classes={{
                                    root: classes.titleBar,
                                    title: classes.title,
                                }}
                                actionIcon={
                                    <IconButton
                                        aria-label={`star ${place.img_title}`}
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

export default React.memo(Gallery);
// export default Gallery;
