import type { ReactNode } from 'react';
import { createPathComponent } from '@react-leaflet/core';
import L from 'leaflet';
import type { MarkerClusterGroupOptions } from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

type ClusterProps = MarkerClusterGroupOptions & { children?: ReactNode };

const MarkerClusterGroup = createPathComponent<L.MarkerClusterGroup, ClusterProps>(
  ({ children: _c, ...props }, ctx) => {
    const cluster = L.markerClusterGroup(props);
    return {
      instance: cluster,
      context: { ...ctx, layerContainer: cluster }
    };
  }
);

export default MarkerClusterGroup;
