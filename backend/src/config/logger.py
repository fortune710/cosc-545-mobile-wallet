from __future__ import annotations

import logging
import sys

from django.conf import settings


def exception(msg="", details={}, exc_info=True):
    """
    Log an exception during execution.

    This method should be used whenever an user wants to log a
    generic exception that is not properly managed.

    Args:
        message: message identifying the error
        details: dict with context details
        status_code: http status code associated with the error
        exc_info: boolean to indicate if exception information should
        be added to the logging message

    :return:
    """
    logger = logging.getLogger(settings.LOGGER)
    logger.exception(msg=msg or sys.exc_info(), extra=details, exc_info=exc_info, stacklevel=2)


def error(message, details={}, exc_info=False):
    """
    Log an error occurred during execution.

    This method should be used when an exception is properly managed but it
    shouldn't occur.

    Args:
        message: message identifying the error
        details: dict with context details
        exc_info: boolean to indicate if exception information
        should be added to the logging message
    Returns:

    """

    logger = logging.getLogger(settings.LOGGER)
    logger.error(msg=message, extra=details, exc_info=exc_info, stacklevel=2)


def warning(message, details={}, exc_info=False):
    """
    Log a warning message during execution.

    This method is recommended for cases when behaviour isn't the appropriate.

    Args:
        message: message identifying the error
        details: dict with context details
        exc_info: boolean to indicate if exception information
        should be added to the logging message

    Returns:

    """

    logger = logging.getLogger(settings.LOGGER)
    logger.warning(msg=message, extra=details, exc_info=exc_info, stacklevel=2)


def info(message, details={}, exc_info=False):
    """
    Log a info message during execution.

    This method is recommended for cases when activity tracking is needed.

    Args:
        message: message identifying the error
        details: dict with context details
        exc_info: boolean to indicate if exception information should
        be added to the logging message

    Returns:

    """

    logger = logging.getLogger(settings.LOGGER)
    logger.info(msg=message, extra=details, exc_info=exc_info, stacklevel=2)
