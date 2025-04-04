#!/usr/bin/env python3
# -*- coding: utf-8 -*-

#
# SPDX-License-Identifier: GPL-3.0
#
# GNU Radio Python Flow Graph
# Title: pkt_xmt_psk
# Description: packet transmit
# GNU Radio version: 3.10.8.0

from gnuradio import blocks
from gnuradio import digital
from gnuradio import filter
from gnuradio.filter import firdes
from gnuradio import gr
from gnuradio.fft import window
import sys
import signal
from argparse import ArgumentParser
from gnuradio.eng_arg import eng_float, intx
from gnuradio import eng_notation
from gnuradio import uhd
import time
import pkt_xmt_psk_epy_block_0 as epy_block_0  # embedded python block




class pkt_xmt_psk(gr.top_block):

    def __init__(self, InFile='default'):
        gr.top_block.__init__(self, "pkt_xmt_psk", catch_exceptions=True)

        ##################################################
        # Parameters
        ##################################################
        self.InFile = InFile

        ##################################################
        # Variables
        ##################################################
        self.usrp_rate = usrp_rate = 768000
        self.samp_rate = samp_rate = 192000
        self.access_key = access_key = '11100001010110101110100010010011'
        self.sps = sps = (int)(usrp_rate/samp_rate)
        self.rs_ratio = rs_ratio = 1.040
        self.low_pass_filter_taps = low_pass_filter_taps = firdes.low_pass(1.0, samp_rate, 20000,2000, window.WIN_HAMMING, 6.76)
        self.hdr_format = hdr_format = digital.header_format_default(access_key, 0)
        self.excess_bw = excess_bw = 0.35
        self.bpsk = bpsk = digital.constellation_bpsk().base()
        self.bpsk.set_npwr(1.0)

        ##################################################
        # Blocks
        ##################################################

        self.uhd_usrp_sink_0 = uhd.usrp_sink(
            ",".join(("send_frame_size=4096", "", "master_clock_rate=30.72e6")),
            uhd.stream_args(
                cpu_format="fc32",
                args='',
                channels=list(range(0,1)),
            ),
            '',
        )
        self.uhd_usrp_sink_0.set_samp_rate(samp_rate)
        self.uhd_usrp_sink_0.set_time_now(uhd.time_spec(time.time()), uhd.ALL_MBOARDS)

        self.uhd_usrp_sink_0.set_center_freq(915e06, 0)
        self.uhd_usrp_sink_0.set_antenna('TX/RX', 0)
        self.uhd_usrp_sink_0.set_bandwidth(200000, 0)
        self.uhd_usrp_sink_0.set_gain(60, 0)
        self.mmse_resampler_xx_0 = filter.mmse_resampler_cc(0, (1.0/((usrp_rate/samp_rate)*rs_ratio)))
        self.low_pass_filter_0 = filter.fir_filter_ccf(
            1,
            firdes.low_pass(
                1,
                samp_rate,
                5000,
                1000,
                window.WIN_HAMMING,
                6.76))
        self.fft_filter_xxx_0_0_0 = filter.fft_filter_ccc(1, low_pass_filter_taps, 1)
        self.fft_filter_xxx_0_0_0.declare_sample_delay(0)
        self.epy_block_0 = epy_block_0.blk(FileName=InFile, Pkt_len=60)
        self.digital_protocol_formatter_bb_0 = digital.protocol_formatter_bb(hdr_format, "packet_len")
        self.digital_crc32_bb_0 = digital.crc32_bb(False, "packet_len", True)
        self.digital_constellation_modulator_0 = digital.generic_mod(
            constellation=bpsk,
            differential=True,
            samples_per_symbol=sps,
            pre_diff_code=True,
            excess_bw=excess_bw,
            verbose=False,
            log=False,
            truncate=False)
        self.blocks_tagged_stream_mux_0 = blocks.tagged_stream_mux(gr.sizeof_char*1, 'packet_len', 0)


        ##################################################
        # Connections
        ##################################################
        self.connect((self.blocks_tagged_stream_mux_0, 0), (self.digital_constellation_modulator_0, 0))
        self.connect((self.digital_constellation_modulator_0, 0), (self.fft_filter_xxx_0_0_0, 0))
        self.connect((self.digital_crc32_bb_0, 0), (self.blocks_tagged_stream_mux_0, 1))
        self.connect((self.digital_crc32_bb_0, 0), (self.digital_protocol_formatter_bb_0, 0))
        self.connect((self.digital_protocol_formatter_bb_0, 0), (self.blocks_tagged_stream_mux_0, 0))
        self.connect((self.epy_block_0, 0), (self.digital_crc32_bb_0, 0))
        self.connect((self.fft_filter_xxx_0_0_0, 0), (self.mmse_resampler_xx_0, 0))
        self.connect((self.low_pass_filter_0, 0), (self.uhd_usrp_sink_0, 0))
        self.connect((self.mmse_resampler_xx_0, 0), (self.low_pass_filter_0, 0))


    def get_InFile(self):
        return self.InFile

    def set_InFile(self, InFile):
        self.InFile = InFile
        self.epy_block_0.FileName = self.InFile

    def get_usrp_rate(self):
        return self.usrp_rate

    def set_usrp_rate(self, usrp_rate):
        self.usrp_rate = usrp_rate
        self.set_sps((int)(self.usrp_rate/self.samp_rate))
        self.mmse_resampler_xx_0.set_resamp_ratio((1.0/((self.usrp_rate/self.samp_rate)*self.rs_ratio)))

    def get_samp_rate(self):
        return self.samp_rate

    def set_samp_rate(self, samp_rate):
        self.samp_rate = samp_rate
        self.set_low_pass_filter_taps(firdes.low_pass(1.0, self.samp_rate, 20000, 2000, window.WIN_HAMMING, 6.76))
        self.set_sps((int)(self.usrp_rate/self.samp_rate))
        self.low_pass_filter_0.set_taps(firdes.low_pass(1, self.samp_rate, 5000, 1000, window.WIN_HAMMING, 6.76))
        self.mmse_resampler_xx_0.set_resamp_ratio((1.0/((self.usrp_rate/self.samp_rate)*self.rs_ratio)))
        self.uhd_usrp_sink_0.set_samp_rate(self.samp_rate)

    def get_access_key(self):
        return self.access_key

    def set_access_key(self, access_key):
        self.access_key = access_key
        self.set_hdr_format(digital.header_format_default(self.access_key, 0))

    def get_sps(self):
        return self.sps

    def set_sps(self, sps):
        self.sps = sps

    def get_rs_ratio(self):
        return self.rs_ratio

    def set_rs_ratio(self, rs_ratio):
        self.rs_ratio = rs_ratio
        self.mmse_resampler_xx_0.set_resamp_ratio((1.0/((self.usrp_rate/self.samp_rate)*self.rs_ratio)))

    def get_low_pass_filter_taps(self):
        return self.low_pass_filter_taps

    def set_low_pass_filter_taps(self, low_pass_filter_taps):
        self.low_pass_filter_taps = low_pass_filter_taps
        self.fft_filter_xxx_0_0_0.set_taps(self.low_pass_filter_taps)

    def get_hdr_format(self):
        return self.hdr_format

    def set_hdr_format(self, hdr_format):
        self.hdr_format = hdr_format

    def get_excess_bw(self):
        return self.excess_bw

    def set_excess_bw(self, excess_bw):
        self.excess_bw = excess_bw

    def get_bpsk(self):
        return self.bpsk

    def set_bpsk(self, bpsk):
        self.bpsk = bpsk



def argument_parser():
    description = 'packet transmit'
    parser = ArgumentParser(description=description)
    parser.add_argument(
        "--InFile", dest="InFile", type=str, default='default',
        help="Set File Name [default=%(default)r]")
    return parser


def main(top_block_cls=pkt_xmt_psk, options=None):
    if options is None:
        options = argument_parser().parse_args()
    tb = top_block_cls(InFile=options.InFile)

    def sig_handler(sig=None, frame=None):
        tb.stop()
        tb.wait()

        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    tb.start()

    try:
        input('Press Enter to quit: ')
    except EOFError:
        pass
    tb.stop()
    tb.wait()


if __name__ == '__main__':
    main()
